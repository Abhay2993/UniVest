/**
 * Investable Deep-Tech Index — pure, unit-tested. Turns the benchmark index into
 * a product: pick the qualifying live deals (a diligence bar on independently-
 * attested milestones, optional vertical filter) and spread a budget across them
 * by water-filling, capped per deal. Mirrors the backend index service.
 */
import { Startup, Vertical } from '../types';

export interface IndexCandidate {
  startupId: string;
  startupName: string;
  vertical: Vertical;
  capacity: number;
  attested: number;
  weightPct: number;
}

export interface IndexComposition {
  constituents: IndexCandidate[];
  count: number;
  totalCapacity: number;
}

export interface Allocation {
  startupId: string;
  amount: number;
}

export interface AllocationPlan {
  allocations: Allocation[];
  deployed: number;
  undeployed: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const EPS = 1e-6;

/** A deal's completed + independently-attested milestone count (the diligence bar). */
export function attestedMilestoneCount(startup: Startup): number {
  return startup.milestones.filter((m) => m.status === 'completed' && m.attestation).length;
}

export interface IndexCriteria {
  minAttested: number;
  verticals: Vertical[];
}

/** The qualifying constituents for the given criteria, equal-weighted. */
export function indexComposition(startups: Startup[], criteria: IndexCriteria): IndexComposition {
  const rows = startups
    .map((s) => ({
      startupId: s.id,
      startupName: s.name,
      vertical: s.vertical,
      capacity: round2(Math.max(s.targetAmount - s.raisedAmount, 0)),
      attested: attestedMilestoneCount(s),
    }))
    .filter(
      (r) =>
        r.capacity > 0 &&
        r.attested >= criteria.minAttested &&
        (criteria.verticals.length === 0 || criteria.verticals.includes(r.vertical)),
    )
    .sort((a, b) => b.capacity - a.capacity);

  const n = rows.length;
  const weightPct = n > 0 ? round2(100 / n) : 0;
  return {
    constituents: rows.map((r) => ({ ...r, weightPct })),
    count: n,
    totalCapacity: round2(rows.reduce((a, r) => a + r.capacity, 0)),
  };
}

/** Spread `budget` across candidates, capping each at maxPerDealPct of budget. */
export function allocateBudget(
  budget: number,
  candidates: { startupId: string; capacity: number }[],
  maxPerDealPct: number,
): AllocationPlan {
  const perDealCap = (budget * maxPerDealPct) / 100;
  const slots = candidates
    .map((c) => ({ id: c.startupId, cap: Math.min(c.capacity, perDealCap), amt: 0 }))
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
    .map((s) => ({ startupId: s.id, amount: round2(s.amt) }));
  const deployed = round2(allocations.reduce((a, b) => a + b.amount, 0));
  return { allocations, deployed, undeployed: round2(Math.max(budget - deployed, 0)) };
}
