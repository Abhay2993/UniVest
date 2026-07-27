/**
 * Milestone-tranched escrow — pure, unit-tested. Mirrors the backend escrow
 * service and the `campaign_escrow_summary` SQL view: raised capital is released
 * in tranches, each gated on an *attested* milestone, so disbursement tracks
 * independently-verified progress. Capital still held is protected in escrow.
 */
import { Milestone, MilestoneStatus } from '../types';

export type TrancheStatus = 'held' | 'released' | 'refunded';

export interface EscrowTranche {
  position: number;
  label: string;
  releasePct: number;
  amount: number;
  status: TrancheStatus;
  milestoneStatus: MilestoneStatus;
  /** Whether the gating milestone carries a signed attestation. */
  attested: boolean;
}

export interface EscrowSummary {
  escrowTotal: number;
  releasedAmount: number;
  heldAmount: number;
  refundedAmount: number;
  releasedPct: number;
  heldPct: number;
  /** Share of the envelope still protected in escrow (held). */
  deRiskedPct: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Integer-percent split that sums to exactly 100 via cumulative rounding, so a
 * schedule never over- or under-allocates the envelope (e.g. n=3 → 33/33/34).
 */
function evenPercents(n: number): number[] {
  const pcts: number[] = [];
  for (let i = 0; i < n; i++) {
    pcts.push(Math.round((100 * (i + 1)) / n) - Math.round((100 * i) / n));
  }
  return pcts;
}

/**
 * Derive an escrow release schedule from a deal's milestones: each milestone
 * gates a tranche, released only once it is completed *and* attested; otherwise
 * the capital stays protected in escrow.
 */
export function scheduleFromMilestones(
  milestones: Milestone[],
  escrowTotal: number,
): EscrowTranche[] {
  const pcts = evenPercents(milestones.length);
  return milestones.map((m, i) => {
    const attested = !!m.attestation;
    const released = m.status === 'completed' && attested;
    return {
      position: i + 1,
      label: m.title,
      releasePct: pcts[i],
      amount: round2((escrowTotal * pcts[i]) / 100),
      status: released ? 'released' : 'held',
      milestoneStatus: m.status,
      attested,
    };
  });
}

/** Roll a tranche schedule up into the escrow summary. */
export function summarizeEscrow(tranches: EscrowTranche[], escrowTotal: number): EscrowSummary {
  let releasedAmount = 0;
  let refundedAmount = 0;
  let releasedPct = 0;
  for (const t of tranches) {
    if (t.status === 'released') {
      releasedAmount += t.amount;
      releasedPct += t.releasePct;
    } else if (t.status === 'refunded') {
      refundedAmount += t.amount;
    }
  }
  releasedAmount = round2(releasedAmount);
  refundedAmount = round2(refundedAmount);
  const heldAmount = round2(Math.max(escrowTotal - releasedAmount - refundedAmount, 0));
  const heldPct = escrowTotal > 0 ? round2((heldAmount / escrowTotal) * 100) : 0;
  return {
    escrowTotal: round2(escrowTotal),
    releasedAmount,
    refundedAmount,
    heldAmount,
    releasedPct: round2(releasedPct),
    heldPct,
    deRiskedPct: heldPct,
  };
}
