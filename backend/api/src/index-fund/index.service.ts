import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import { allocateBudget, Candidate, nextRun, quarterLabel } from './index.util';

interface MandateRow {
  id: string;
  budget_amount: string;
  currency_code: string;
  cadence: 'once' | 'quarterly';
  verticals: string[];
  min_attested_milestones: number;
  max_per_deal_pct: string;
  status: string;
  next_run_at: Date | null;
}

interface CreateMandate {
  budgetAmount?: number;
  currencyCode?: string;
  cadence?: 'once' | 'quarterly';
  verticals?: string[];
  minAttestedMilestones?: number;
  maxPerDealPct?: number;
}

@Injectable()
export class IndexService {
  constructor(private readonly db: DbService) {}

  /** Qualifying live deals for the given filters, with capacity + attestation. */
  private async candidates(
    q: Query,
    currency: string,
    minAttested: number,
    verticals: string[],
  ) {
    const res = await q(
      `SELECT c.id AS campaign_id, s.name AS startup_name, s.vertical, c.currency_code,
              (c.target_amount - c.raised_amount) AS capacity,
              COALESCE(am.attested_count, 0) AS attested
         FROM campaigns c
         JOIN startups s ON s.id = c.startup_id
         LEFT JOIN campaign_attested_milestones am ON am.campaign_id = c.id
        WHERE c.status = 'live'
          AND c.currency_code = $1
          AND (c.target_amount - c.raised_amount) > 0
          AND COALESCE(am.attested_count, 0) >= $2
          AND (cardinality($3::text[]) = 0 OR s.vertical = ANY($3))
        ORDER BY capacity DESC`,
      [currency, minAttested, verticals],
    );
    return res.rows.map((r: any) => ({
      campaignId: r.campaign_id,
      startupName: r.startup_name,
      vertical: r.vertical,
      capacity: Number(r.capacity),
      attested: Number(r.attested),
    }));
  }

  /** The index composition for a set of filters (equal-weight constituents). */
  async composition(currency = 'USD', minAttested = 1, verticals: string[] = []) {
    return this.db.asAdmin(async (q) => {
      const rows = await this.candidates(q, currency, minAttested, verticals);
      const n = rows.length;
      const weight = n > 0 ? Math.round((100 / n) * 100) / 100 : 0;
      const totalCapacity = Math.round(rows.reduce((a, r) => a + r.capacity, 0) * 100) / 100;
      return {
        currency,
        minAttested,
        verticals,
        count: n,
        totalCapacity,
        constituents: rows.map((r) => ({
          campaignId: r.campaignId,
          startupName: r.startupName,
          vertical: r.vertical,
          capacity: r.capacity,
          attested: r.attested,
          weightPct: weight,
        })),
      };
    });
  }

  private shapeMandate(r: MandateRow, deployed = 0) {
    return {
      id: r.id,
      budgetAmount: Number(r.budget_amount),
      currencyCode: r.currency_code,
      cadence: r.cadence,
      verticals: r.verticals,
      minAttestedMilestones: Number(r.min_attested_milestones),
      maxPerDealPct: Number(r.max_per_deal_pct),
      status: r.status,
      nextRunAt: r.next_run_at ? new Date(r.next_run_at).toISOString() : null,
      deployedToDate: deployed,
    };
  }

  async listMandates(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q<MandateRow>(
        'SELECT * FROM index_mandates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
      );
      const out = [];
      for (const m of res.rows) {
        const dep = await q<{ total: string }>(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM index_allocations WHERE mandate_id = $1',
          [m.id],
        );
        out.push(this.shapeMandate(m, Number(dep.rows[0].total)));
      }
      return out;
    });
  }

  async createMandate(userId: string, body: CreateMandate) {
    const budget = Number(body.budgetAmount);
    if (!(budget > 0)) throw new BadRequestException('budgetAmount must be positive');
    const pct = body.maxPerDealPct ?? 25;
    if (!(pct > 0 && pct <= 100)) throw new BadRequestException('maxPerDealPct must be in (0, 100]');
    const cadence = body.cadence === 'quarterly' ? 'quarterly' : 'once';
    const id = await this.db.asUser(userId, async (q) => {
      const res = await q<{ id: string }>(
        `INSERT INTO index_mandates
           (user_id, budget_amount, currency_code, cadence, verticals, min_attested_milestones, max_per_deal_pct, next_run_at)
         VALUES ($1, $2, $3, $4::index_cadence, $5, $6, $7, $8) RETURNING id`,
        [
          userId,
          budget,
          body.currencyCode ?? 'USD',
          cadence,
          body.verticals ?? [],
          body.minAttestedMilestones ?? 1,
          pct,
          cadence === 'quarterly' ? new Date() : null,
        ],
      );
      return res.rows[0].id;
    });
    return this.getMandate(userId, id);
  }

  private async getMandate(userId: string, id: string): Promise<MandateRow> {
    return this.db.asUser(userId, async (q) => {
      const res = await q<MandateRow>('SELECT * FROM index_mandates WHERE id = $1', [id]);
      if (res.rowCount === 0) throw new NotFoundException('mandate not found');
      return res.rows[0];
    });
  }

  /** Compute the allocation plan for a mandate's current period. */
  private async plan(m: MandateRow) {
    return this.db.asAdmin(async (q) => {
      const cands = await this.candidates(
        q,
        m.currency_code,
        Number(m.min_attested_milestones),
        m.verticals,
      );
      const simple: Candidate[] = cands.map((c) => ({ campaignId: c.campaignId, capacity: c.capacity }));
      const plan = allocateBudget(Number(m.budget_amount), simple, Number(m.max_per_deal_pct));
      const byId = new Map(cands.map((c) => [c.campaignId, c]));
      return {
        allocations: plan.allocations.map((a) => ({
          ...a,
          startupName: byId.get(a.campaignId)?.startupName ?? null,
          vertical: byId.get(a.campaignId)?.vertical ?? null,
        })),
        deployed: plan.deployed,
        undeployed: plan.undeployed,
        constituentCount: cands.length,
      };
    });
  }

  /** Dry-run: what a run would allocate, without persisting. */
  async preview(userId: string, id: string) {
    const m = await this.getMandate(userId, id);
    const period = m.cadence === 'once' ? 'once' : quarterLabel();
    return { period, ...(await this.plan(m)) };
  }

  /** Execute a period's allocation and advance the mandate's cadence. */
  async run(userId: string, id: string) {
    const m = await this.getMandate(userId, id);
    if (m.status !== 'active') throw new ConflictException(`mandate is ${m.status}`);
    const period = m.cadence === 'once' ? 'once' : quarterLabel();
    const planned = await this.plan(m);

    const persisted = await this.db.asUser(userId, async (q) => {
      let n = 0;
      for (const a of planned.allocations) {
        const res = await q(
          `INSERT INTO index_allocations (mandate_id, user_id, campaign_id, amount, period)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (mandate_id, campaign_id, period) DO NOTHING`,
          [id, userId, a.campaignId, a.amount, period],
        );
        n += res.rowCount ?? 0;
      }
      // One-off mandates complete; rolling ones schedule the next quarter.
      if (m.cadence === 'once') {
        await q(`UPDATE index_mandates SET status = 'completed' WHERE id = $1`, [id]);
      } else {
        await q('UPDATE index_mandates SET next_run_at = $2 WHERE id = $1', [id, nextRun()]);
      }
      return n;
    });

    return { period, persistedCount: persisted, ...planned };
  }

  async allocations(userId: string, id: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `SELECT a.period, a.amount, a.created_at, s.name AS startup_name, s.vertical
           FROM index_allocations a
           JOIN campaigns c ON c.id = a.campaign_id
           JOIN startups s  ON s.id = c.startup_id
          WHERE a.mandate_id = $1
          ORDER BY a.created_at DESC`,
        [id],
      );
      return res.rows.map((r: any) => ({
        period: r.period,
        amount: Number(r.amount),
        startupName: r.startup_name,
        vertical: r.vertical,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    });
  }

  async pause(userId: string, id: string) {
    await this.getMandate(userId, id);
    await this.db.asUser(userId, (q) =>
      q(`UPDATE index_mandates SET status = 'paused' WHERE id = $1 AND status = 'active'`, [id]),
    );
    return this.shapeMandate(await this.getMandate(userId, id));
  }
}
