/**
 * University-OS aggregation — the supply-side lock-in math. Pure functions
 * over a TTO's full spinout portfolio (companies it raised on UniVest AND
 * ones it merely tracks), so the whole dashboard is unit-testable. Once a
 * tech-transfer office runs its portfolio, cap tables, and LP reporting here,
 * switching cost is enormous.
 */
import { Vertical } from '../types';

export interface CapTable {
  /** Percentages; should sum to ~100. */
  founders: number;
  university: number;
  optionPool: number;
  investors: number;
}

export interface SpinoutHolding {
  id: string;
  name: string;
  vertical: Vertical;
  stage: string;
  /** True if the company raised on UniVest; false = tracked-only (off-platform). */
  onPlatform: boolean;
  raisedToDate: number;
  postMoney: number;
  capTable: CapTable;
  milestonesCompleted: number;
  milestonesTotal: number;
  nextMilestone: string;
  /** ISO date of last milestone/update. */
  lastUpdate: string;
}

export interface Consortium {
  id: string;
  name: string;
  thesis: string;
  vertical: Vertical;
  /** University short names. */
  members: string[];
  leadUniversity: string;
  committedCapital: number;
  deals: number;
}

/** Value of the university's equity across the portfolio (post-money weighted). */
export function universityEquityValue(holdings: SpinoutHolding[]): number {
  return holdings.reduce((sum, h) => sum + (h.postMoney * h.capTable.university) / 100, 0);
}

export function capTableSum(cap: CapTable): number {
  return cap.founders + cap.university + cap.optionPool + cap.investors;
}

export function capTableIsValid(cap: CapTable): boolean {
  return Math.abs(capTableSum(cap) - 100) < 0.5;
}

export interface PortfolioStats {
  count: number;
  onPlatform: number;
  offPlatform: number;
  totalRaised: number;
  portfolioValue: number;
  universityEquityValue: number;
  /** Mean milestone completion across the portfolio, 0..1. */
  avgProgress: number;
  milestonesCompleted: number;
}

export function portfolioStats(holdings: SpinoutHolding[]): PortfolioStats {
  const count = holdings.length;
  const totalRaised = holdings.reduce((s, h) => s + h.raisedToDate, 0);
  const portfolioValue = holdings.reduce((s, h) => s + h.postMoney, 0);
  const milestonesCompleted = holdings.reduce((s, h) => s + h.milestonesCompleted, 0);
  const avgProgress =
    count === 0
      ? 0
      : holdings.reduce(
          (s, h) => s + (h.milestonesTotal === 0 ? 0 : h.milestonesCompleted / h.milestonesTotal),
          0,
        ) / count;
  return {
    count,
    onPlatform: holdings.filter((h) => h.onPlatform).length,
    offPlatform: holdings.filter((h) => !h.onPlatform).length,
    totalRaised,
    portfolioValue,
    universityEquityValue: universityEquityValue(holdings),
    avgProgress,
    milestonesCompleted,
  };
}

/** Exposure of the portfolio by vertical, weighted by post-money. Sorted desc. */
export function portfolioByVertical(holdings: SpinoutHolding[]): { vertical: string; weight: number }[] {
  const total = holdings.reduce((s, h) => s + h.postMoney, 0) || 1;
  const acc = new Map<string, number>();
  for (const h of holdings) acc.set(h.vertical, (acc.get(h.vertical) ?? 0) + h.postMoney);
  return [...acc.entries()]
    .map(([vertical, v]) => ({ vertical, weight: v / total }))
    .sort((a, b) => b.weight - a.weight);
}

export function consortiumTotalCommitted(consortia: Consortium[]): number {
  return consortia.reduce((s, c) => s + c.committedCapital, 0);
}
