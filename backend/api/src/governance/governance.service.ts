import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import { finalize, tally, TallyInput } from './governance.util';

type VoteChoice = 'for' | 'against' | 'abstain';
const CHOICES: VoteChoice[] = ['for', 'against', 'abstain'];

export interface ProposalView {
  id: string;
  spvId: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  quorumPct: number;
  opensAt: string;
  closesAt: string;
  tally: ReturnType<typeof tally>;
  myVote: VoteChoice | null;
}

@Injectable()
export class GovernanceService {
  constructor(private readonly db: DbService) {}

  private async requireAdmin(userId: string): Promise<void> {
    const isAdmin = await this.db.asAdmin(async (q) => {
      const res = await q<{ role: string }>(
        'SELECT role FROM users WHERE id = $1 AND deactivated_at IS NULL',
        [userId],
      );
      return res.rows[0]?.role === 'admin';
    });
    if (!isAdmin) throw new ForbiddenException('admin role required');
  }

  /** The caller's units in an SPV (their voting weight); 0 if not a holder. */
  private async holdingUnits(q: Query, userId: string, spvId: string): Promise<number> {
    const res = await q<{ units: string }>(
      'SELECT units FROM spv_holdings WHERE spv_id = $1 AND user_id = $2',
      [spvId, userId],
    );
    return res.rows[0] ? Number(res.rows[0].units) : 0;
  }

  private async buildProposal(q: Query, row: any, userId: string): Promise<ProposalView> {
    const t = await q(
      `SELECT for_weight, against_weight, abstain_weight, eligible_weight, quorum_pct
         FROM proposal_tally WHERE proposal_id = $1`,
      [row.id],
    );
    const tr = t.rows[0] ?? {
      for_weight: 0, against_weight: 0, abstain_weight: 0, eligible_weight: 0, quorum_pct: row.quorum_pct,
    };
    const input: TallyInput = {
      forWeight: Number(tr.for_weight),
      againstWeight: Number(tr.against_weight),
      abstainWeight: Number(tr.abstain_weight),
      eligibleWeight: Number(tr.eligible_weight),
      quorumPct: Number(tr.quorum_pct),
    };
    const mine = await q<{ choice: VoteChoice }>(
      'SELECT choice FROM governance_votes WHERE proposal_id = $1 AND voter_id = $2',
      [row.id, userId],
    );
    return {
      id: row.id,
      spvId: row.spv_id,
      title: row.title,
      description: row.description,
      kind: row.kind,
      status: row.status,
      quorumPct: Number(row.quorum_pct),
      opensAt: new Date(row.opens_at).toISOString(),
      closesAt: new Date(row.closes_at).toISOString(),
      tally: tally(input),
      myVote: mine.rows[0]?.choice ?? null,
    };
  }

  /** Proposals for an SPV (holders and admins only). */
  async listForSpv(userId: string, spvId: string) {
    return this.db.asAdmin(async (q) => {
      const holder = (await this.holdingUnits(q, userId, spvId)) > 0;
      const admin = await q<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId]);
      if (!holder && admin.rows[0]?.role !== 'admin') {
        throw new ForbiddenException('only SPV holders can view its governance');
      }
      const rows = await q(
        `SELECT * FROM governance_proposals WHERE spv_id = $1 ORDER BY closes_at DESC`,
        [spvId],
      );
      return Promise.all(rows.rows.map((r) => this.buildProposal(q, r, userId)));
    });
  }

  /** A single proposal with its tally and the caller's vote. */
  async getProposal(userId: string, proposalId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q('SELECT * FROM governance_proposals WHERE id = $1', [proposalId]);
      if (rows.rowCount === 0) throw new NotFoundException('proposal not found');
      return this.buildProposal(q, rows.rows[0], userId);
    });
  }

  /** Cast (or change) the caller's weighted vote. Holders only, one per holder. */
  async vote(userId: string, proposalId: string, choice: string) {
    if (!CHOICES.includes(choice as VoteChoice)) {
      throw new BadRequestException(`choice must be one of ${CHOICES.join(', ')}`);
    }
    const spvId = await this.db.asAdmin(async (q) => {
      const p = await q<{ spv_id: string; status: string; closes_at: Date }>(
        'SELECT spv_id, status, closes_at FROM governance_proposals WHERE id = $1',
        [proposalId],
      );
      if (p.rowCount === 0) throw new NotFoundException('proposal not found');
      if (p.rows[0].status !== 'open') throw new ConflictException('proposal is closed');
      if (new Date(p.rows[0].closes_at).getTime() < Date.now()) {
        throw new ConflictException('voting window has closed');
      }
      return p.rows[0].spv_id;
    });

    // The weight is the caller's own holdings, snapshotted; the vote is written
    // under the caller's identity (RLS gov_votes_write enforces voter = self).
    await this.db.asUser(userId, async (q) => {
      const units = await this.holdingUnits(q, userId, spvId);
      if (units <= 0) throw new ForbiddenException('only SPV holders can vote');
      await q(
        `INSERT INTO governance_votes (proposal_id, voter_id, choice, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (proposal_id, voter_id)
         DO UPDATE SET choice = EXCLUDED.choice, weight = EXCLUDED.weight, created_at = now()`,
        [proposalId, userId, choice, units],
      );
    });
    return this.getProposal(userId, proposalId);
  }

  /** Create a proposal (admin). */
  async create(
    userId: string,
    body: { spvId?: string; title?: string; description?: string; kind?: string; quorumPct?: number; closesAt?: string },
  ) {
    await this.requireAdmin(userId);
    const { spvId, title, description } = body;
    if (!spvId || !title || !description) {
      throw new BadRequestException('spvId, title, and description are required');
    }
    const kind = body.kind ?? 'general';
    const quorumPct = body.quorumPct ?? 50;
    const closesAt = body.closesAt ?? new Date(Date.now() + 7 * 864e5).toISOString();
    const created = await this.db.asAdmin(async (q) => {
      const spv = await q('SELECT id FROM spvs WHERE id = $1', [spvId]);
      if (spv.rowCount === 0) throw new NotFoundException('spv not found');
      const res = await q<{ id: string }>(
        `INSERT INTO governance_proposals (spv_id, title, description, kind, quorum_pct, created_by, closes_at)
         VALUES ($1, $2, $3, $4::proposal_kind, $5, $6, $7) RETURNING id`,
        [spvId, title, description, kind, quorumPct, userId, closesAt],
      );
      return res.rows[0].id;
    });
    return this.getProposal(userId, created);
  }

  /** Close a proposal and finalize its outcome (admin). */
  async close(userId: string, proposalId: string) {
    await this.requireAdmin(userId);
    await this.db.asAdmin(async (q) => {
      const p = await q('SELECT status FROM governance_proposals WHERE id = $1', [proposalId]);
      if (p.rowCount === 0) throw new NotFoundException('proposal not found');
      if (p.rows[0].status !== 'open') throw new ConflictException('proposal already closed');
      const t = await q(
        `SELECT for_weight, against_weight, abstain_weight, eligible_weight, quorum_pct
           FROM proposal_tally WHERE proposal_id = $1`,
        [proposalId],
      );
      const tr = t.rows[0];
      const outcome = finalize({
        forWeight: Number(tr.for_weight),
        againstWeight: Number(tr.against_weight),
        abstainWeight: Number(tr.abstain_weight),
        eligibleWeight: Number(tr.eligible_weight),
        quorumPct: Number(tr.quorum_pct),
      });
      await q(
        `UPDATE governance_proposals SET status = $2::proposal_status, closed_at = now() WHERE id = $1`,
        [proposalId, outcome],
      );
    });
    return this.getProposal(userId, proposalId);
  }
}
