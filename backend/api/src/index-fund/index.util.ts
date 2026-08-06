/**
 * Deep-Tech Index auto-invest — pure allocation math, dependency-free so it can
 * be unit-tested in isolation (test/index.spec.mjs) and shared by the service.
 * A budget is spread across qualifying deals by water-filling: equal shares until
 * a deal hits its per-deal cap or its remaining capacity, with the rest flowing
 * to the deals that still have room. Whatever can't be placed is reported as
 * undeployed.
 */

export interface Candidate {
  campaignId: string;
  capacity: number;
}

export interface Allocation {
  campaignId: string;
  amount: number;
}

export interface AllocationPlan {
  allocations: Allocation[];
  deployed: number;
  undeployed: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const EPS = 1e-6;

/** Spread `budget` across `candidates`, capping each at maxPerDealPct of budget. */
export function allocateBudget(
  budget: number,
  candidates: Candidate[],
  maxPerDealPct: number,
): AllocationPlan {
  const perDealCap = (budget * maxPerDealPct) / 100;
  const slots = candidates
    .map((c) => ({ id: c.campaignId, cap: Math.min(c.capacity, perDealCap), amt: 0 }))
    .filter((s) => s.cap > EPS);

  let remaining = budget;
  for (let guard = 0; guard < 10000 && remaining > EPS; guard++) {
    const active = slots.filter((s) => s.cap - s.amt > EPS);
    if (active.length === 0) break;
    const share = remaining / active.length;
    let progressed = false;
    for (const s of active) {
      const add = Math.min(share, s.cap - s.amt);
      if (add > EPS) {
        s.amt += add;
        remaining -= add;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const allocations = slots
    .filter((s) => s.amt > EPS)
    .map((s) => ({ campaignId: s.id, amount: round2(s.amt) }));
  const deployed = round2(allocations.reduce((a, b) => a + b.amount, 0));
  return { allocations, deployed, undeployed: round2(Math.max(budget - deployed, 0)) };
}

/** Calendar quarter label, e.g. "2026-Q3". */
export function quarterLabel(d = new Date()): string {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/** The next run date for a quarterly mandate (three months on). */
export function nextRun(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, d.getUTCDate()));
}
