/**
 * Seeded SPV governance proposals, keyed to a portfolio position's SPV. Voting
 * weight is the holder's units; `otherVotes` are the weights already cast by
 * other holders, so the card folds in the demo user's own vote at their unit
 * weight. Mirrors the backend `governance_proposals` / `governance_votes`.
 */
export type ProposalKind =
  | 'escrow_release'
  | 'tender_approval'
  | 'deadline_extension'
  | 'follow_on'
  | 'general';

export interface Proposal {
  id: string;
  /** Matches a portfolio position's spvName. */
  spvName: string;
  title: string;
  description: string;
  kind: ProposalKind;
  quorumPct: number;
  closesInDays: number;
  /** Total eligible voting weight (sum of the SPV's holdings). */
  eligibleWeight: number;
  /** Weights already cast by other holders (excludes the demo user). */
  otherVotes: { for: number; against: number; abstain: number };
}

export const PROPOSALS: Proposal[] = [
  {
    id: 'gp1',
    spvName: 'UniVest SPV Series 019',
    title: 'Approve secondary tender window at 12.50/unit',
    description:
      'The lead has sourced a buyer for up to 20% of the SPV at 12.50 per unit. Approve opening a tender window so holders may sell pro-rata at that price.',
    kind: 'tender_approval',
    quorumPct: 50,
    closesInDays: 10,
    eligibleWeight: 430,
    otherVotes: { for: 150, against: 20, abstain: 0 },
  },
  {
    id: 'gp2',
    spvName: 'UniVest SPV Series 042',
    title: 'Ratify Q3 escrow release for the pilot line',
    description:
      'The Pilot Manufacturing milestone is progressing. Ratify releasing its escrow tranche once the milestone is independently attested.',
    kind: 'escrow_release',
    quorumPct: 40,
    closesInDays: 6,
    eligibleWeight: 900,
    otherVotes: { for: 120, against: 40, abstain: 30 },
  },
];

export const PROPOSAL_KIND_LABEL: Record<ProposalKind, string> = {
  escrow_release: 'Escrow release',
  tender_approval: 'Tender approval',
  deadline_extension: 'Deadline extension',
  follow_on: 'Follow-on',
  general: 'General',
};
