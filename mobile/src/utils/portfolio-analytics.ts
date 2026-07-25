/**
 * Portfolio analytics — pure, unit-tested aggregation for the Analytics tab.
 * Exposure breakdowns, MOIC, and portfolio-level TVPI. Mirrors the backend
 * analytics service (backend/api/src/portfolio).
 */

export interface PositionInput {
  currentValue: number;
  costBasis: number;
}

export interface ExposureSlice {
  key: string;
  value: number;
  pct: number;
}

const round = (n: number, dp = 2): number => Math.round(n * 10 ** dp) / 10 ** dp;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Multiple on invested capital for a single position. */
export function moic(currentValue: number, costBasis: number): number {
  if (costBasis <= 0) return 0;
  return round(currentValue / costBasis, 3);
}

/**
 * Group positions by a key and return value + share of total current value,
 * sorted from largest to smallest exposure.
 */
export function exposureBy<T extends PositionInput>(
  items: T[],
  key: (t: T) => string,
): ExposureSlice[] {
  const total = sum(items.map((i) => i.currentValue));
  const buckets = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    buckets.set(k, (buckets.get(k) ?? 0) + it.currentValue);
  }
  return [...buckets.entries()]
    .map(([k, v]) => ({ key: k, value: round(v, 2), pct: total > 0 ? round((v / total) * 100, 1) : 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface PortfolioMetrics {
  paidIn: number;
  currentValue: number;
  distributions: number;
  totalValue: number;
  totalGain: number;
  tvpi: number;
  moic: number;
}

/** Portfolio-level roll-up: paid-in, value, distributions, TVPI/MOIC, gain. */
export function portfolioMetrics(
  positions: { currentValue: number; costBasis: number }[],
  distributions = 0,
): PortfolioMetrics {
  const paidIn = round(sum(positions.map((p) => p.costBasis)), 2);
  const currentValue = round(sum(positions.map((p) => p.currentValue)), 2);
  const totalValue = round(currentValue + distributions, 2);
  const tvpi = paidIn > 0 ? round(totalValue / paidIn, 3) : 0;
  return {
    paidIn,
    currentValue,
    distributions: round(distributions, 2),
    totalValue,
    totalGain: round(totalValue - paidIn, 2),
    tvpi,
    moic: tvpi,
  };
}

/** Coarse funding-stage label from the number of completed lab milestones. */
export function stageFromMilestones(completed: number): string {
  if (completed >= 3) return 'Growth';
  if (completed === 2) return 'Series A';
  if (completed === 1) return 'Seed';
  return 'Pre-seed';
}

/** Whether a lot has been held long enough for long-term treatment (≥ 1yr). */
export function isLongTerm(acquiredMs: number, endMs: number): boolean {
  return endMs - acquiredMs >= 365.25 * 86_400_000;
}
