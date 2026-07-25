import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Portfolio analytics & tax — institutional-grade reporting over the caller's
 * positions. Reuses the investor_position_metrics view (latest NAV mark), the
 * spv_valuations history (for an annualized return), tax_documents, and the new
 * tax_lots. All queries run under the caller's RLS identity, so a user only
 * ever sees their own portfolio.
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly db: DbService) {}

  async analytics(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const rows = await q(
        `SELECT p.spv_id, sp.legal_name, st.name AS company, st.vertical,
                u.country_code AS country,
                p.units, p.cost_basis, p.current_value, p.unrealized_multiple,
                (SELECT COUNT(*) FROM milestones m
                  WHERE m.startup_id = st.id AND m.status = 'completed') AS completed_milestones,
                (SELECT MIN(sv.as_of) FROM spv_valuations sv WHERE sv.spv_id = p.spv_id) AS first_mark,
                (SELECT MAX(sv.as_of) FROM spv_valuations sv WHERE sv.spv_id = p.spv_id) AS last_mark
           FROM investor_position_metrics p
           JOIN spvs sp       ON sp.id = p.spv_id
           LEFT JOIN campaigns c  ON c.id = sp.campaign_id
           LEFT JOIN startups st  ON st.id = c.startup_id
           LEFT JOIN universities u ON u.id = st.university_id
          ORDER BY p.current_value DESC`,
      );

      const positions = rows.rows.map((r) => {
        const cost = Number(r.cost_basis);
        const value = Number(r.current_value);
        return {
          spvId: r.spv_id,
          legalName: r.legal_name,
          company: r.company,
          vertical: r.vertical,
          country: r.country,
          stage: stageOf(Number(r.completed_milestones)),
          units: Number(r.units),
          costBasis: cost,
          currentValue: value,
          moic: cost > 0 ? round(value / cost, 3) : 0,
          unrealizedGain: round(value - cost, 2),
        };
      });

      const paidIn = round(sum(positions.map((p) => p.costBasis)), 2);
      const currentValue = round(sum(positions.map((p) => p.currentValue)), 2);
      // No realized exits in this dataset; distributions/realized stay 0.
      const distributions = 0;
      const tvpi = paidIn > 0 ? round((currentValue + distributions) / paidIn, 3) : 0;

      // Money-weighted annualized return across the marked holding span.
      const firstMark = minDate(rows.rows.map((r) => r.first_mark));
      const lastMark = maxDate(rows.rows.map((r) => r.last_mark));
      const years =
        firstMark && lastMark ? Math.max(0.25, (lastMark - firstMark) / (365.25 * 86_400_000)) : null;
      const annualizedReturn =
        years && paidIn > 0 ? round(Math.pow((currentValue + distributions) / paidIn, 1 / years) - 1, 4) : null;

      return {
        summary: {
          positionCount: positions.length,
          paidIn,
          currentValue,
          distributions,
          unrealizedValue: currentValue,
          realizedValue: distributions,
          totalGain: round(currentValue + distributions - paidIn, 2),
          tvpi,
          moic: tvpi,
          annualizedReturn,
        },
        positions,
        exposure: {
          byVertical: exposure(positions, (p) => p.vertical ?? 'Unknown'),
          byGeography: exposure(positions, (p) => p.country ?? 'Unknown'),
          byStage: exposure(positions, (p) => p.stage),
        },
      };
    });
  }

  async tax(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const docs = await q(
        `SELECT t.tax_year, t.kind, t.issued_at, s.legal_name,
                (t.issued_at IS NOT NULL) AS available
           FROM tax_documents t
           LEFT JOIN spvs s ON s.id = t.spv_id
          ORDER BY t.tax_year DESC, s.legal_name`,
      );
      const lots = await q(
        `SELECT l.spv_id, s.legal_name, st.name AS company,
                l.acquired_on, l.units, l.cost_basis, l.disposed_on, l.proceeds
           FROM tax_lots l
           JOIN spvs s ON s.id = l.spv_id
           LEFT JOIN campaigns c ON c.id = s.campaign_id
           LEFT JOIN startups st ON st.id = c.startup_id
          WHERE l.user_id = $1
          ORDER BY l.acquired_on`,
        [userId],
      );
      const now = Date.now();
      const YEAR = 365.25 * 86_400_000;
      return {
        documents: docs.rows.map((d) => ({
          taxYear: d.tax_year,
          kind: d.kind,
          legalName: d.legal_name,
          issuedAt: d.issued_at,
          status: d.available ? 'available' : 'pending',
        })),
        lots: lots.rows.map((l) => {
          const acquired = Date.parse(l.acquired_on);
          const end = l.disposed_on ? Date.parse(l.disposed_on) : now;
          const longTerm = end - acquired >= YEAR;
          return {
            spvId: l.spv_id,
            legalName: l.legal_name,
            company: l.company,
            acquiredOn: l.acquired_on,
            units: Number(l.units),
            costBasis: Number(l.cost_basis),
            disposedOn: l.disposed_on,
            proceeds: l.proceeds == null ? null : Number(l.proceeds),
            holdingPeriod: longTerm ? 'long_term' : 'short_term',
            realizedGain: l.proceeds == null ? null : round(Number(l.proceeds) - Number(l.cost_basis), 2),
          };
        }),
      };
    });
  }
}

function stageOf(completedMilestones: number): string {
  if (completedMilestones >= 3) return 'Growth';
  if (completedMilestones === 2) return 'Series A';
  if (completedMilestones === 1) return 'Seed';
  return 'Pre-seed';
}

function exposure<T>(items: T[], key: (t: T) => string) {
  const total = sum(items.map((i) => (i as any).currentValue as number));
  const buckets = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    buckets.set(k, (buckets.get(k) ?? 0) + ((it as any).currentValue as number));
  }
  return [...buckets.entries()]
    .map(([k, v]) => ({ key: k, value: round(v, 2), pct: total > 0 ? round((v / total) * 100, 1) : 0 }))
    .sort((a, b) => b.value - a.value);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
function minDate(ds: (string | null)[]): number | null {
  const t = ds.filter(Boolean).map((d) => Date.parse(d as string));
  return t.length ? Math.min(...t) : null;
}
function maxDate(ds: (string | null)[]): number | null {
  const t = ds.filter(Boolean).map((d) => Date.parse(d as string));
  return t.length ? Math.max(...t) : null;
}
