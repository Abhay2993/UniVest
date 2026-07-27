/**
 * Milestone-tranched escrow — pure math, dependency-free so it can be unit-
 * tested in isolation (test/escrow.spec.mjs) and shared by the service. Mirrors
 * the `campaign_escrow_summary` SQL view: released (to the company, against
 * attested milestones) vs held (protected in escrow) vs refunded.
 */

export type TrancheStatus = 'held' | 'released' | 'refunded';

export interface TrancheInput {
  releasePct: number;
  status: TrancheStatus;
  /** $ snapshot captured at release/refund; falls back to pct × envelope. */
  releasedAmount?: number | null;
}

export interface EscrowSummary {
  escrowTotal: number;
  releasedAmount: number;
  refundedAmount: number;
  heldAmount: number;
  releasedPct: number;
  heldPct: number;
  /** Share of the envelope still protected in escrow (held). */
  deRiskedPct: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The dollar figure for a tranche: its snapshot, or pct × envelope. */
export function trancheAmount(t: TrancheInput, escrowTotal: number): number {
  if (t.releasedAmount != null) return round2(t.releasedAmount);
  return round2((escrowTotal * t.releasePct) / 100);
}

/** Roll the tranche schedule up into the escrow summary for a campaign. */
export function summarizeEscrow(tranches: TrancheInput[], escrowTotal: number): EscrowSummary {
  let releasedAmount = 0;
  let refundedAmount = 0;
  let releasedPct = 0;
  for (const t of tranches) {
    if (t.status === 'released') {
      releasedAmount += trancheAmount(t, escrowTotal);
      releasedPct += t.releasePct;
    } else if (t.status === 'refunded') {
      refundedAmount += trancheAmount(t, escrowTotal);
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

/** A held tranche is releasable once its gating milestone is attested (or on-close). */
export function isReleasable(
  tranche: { status: TrancheStatus; hasMilestone: boolean; milestoneAttested: boolean },
): boolean {
  if (tranche.status !== 'held') return false;
  return !tranche.hasMilestone || tranche.milestoneAttested;
}
