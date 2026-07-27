/**
 * Governance tallying — pure, dependency-free so it can be unit-tested in
 * isolation (test/governance.spec.mjs) and shared by the service. Mirrors the
 * `proposal_tally` SQL view: weighted for/against/abstain against the SPV's
 * eligible weight, with quorum and outcome.
 */

export interface TallyInput {
  forWeight: number;
  againstWeight: number;
  abstainWeight: number;
  /** Total eligible voting weight = sum of the SPV's holdings. */
  eligibleWeight: number;
  quorumPct: number;
}

export interface TallyResult {
  votesCastWeight: number;
  turnoutPct: number;
  quorumMet: boolean;
  /** Each side as a share of eligible weight (bars sum to turnout). */
  forPct: number;
  againstPct: number;
  abstainPct: number;
  leaning: 'for' | 'against' | 'tied';
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function tally(x: TallyInput): TallyResult {
  const votesCastWeight = round2(x.forWeight + x.againstWeight + x.abstainWeight);
  const turnoutPct = x.eligibleWeight > 0 ? round2((votesCastWeight / x.eligibleWeight) * 100) : 0;
  const share = (w: number) => (x.eligibleWeight > 0 ? round2((w / x.eligibleWeight) * 100) : 0);
  const leaning: TallyResult['leaning'] =
    x.forWeight > x.againstWeight ? 'for' : x.againstWeight > x.forWeight ? 'against' : 'tied';
  return {
    votesCastWeight,
    turnoutPct,
    quorumMet: turnoutPct >= x.quorumPct,
    forPct: share(x.forWeight),
    againstPct: share(x.againstWeight),
    abstainPct: share(x.abstainWeight),
    leaning,
  };
}

/** The final outcome at close: passes only if quorum is met and FOR outweighs AGAINST. */
export function finalize(x: TallyInput): 'passed' | 'rejected' {
  const t = tally(x);
  return t.quorumMet && x.forWeight > x.againstWeight ? 'passed' : 'rejected';
}
