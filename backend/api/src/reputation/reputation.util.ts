/**
 * Reputation scoring — pure, dependency-free so it can be unit-tested in
 * isolation (test/reputation.spec.mjs) and shared by the service. One formula
 * governs the API and mobile: an actor's on-platform track record (executed and
 * independently-attested milestones, replications that held up, endorsements,
 * deals led) rolls into a 0–100 trust score. Slips subtract.
 */

export interface ReputationCounts {
  completed: number;
  attested: number;
  replicated: number;
  slipped: number;
  dealsLed: number;
  endorsements: number;
}

export type ReputationBand = 'Exceptional' | 'Strong' | 'Developing' | 'Unproven';

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

export const EMPTY_COUNTS: ReputationCounts = {
  completed: 0,
  attested: 0,
  replicated: 0,
  slipped: 0,
  dealsLed: 0,
  endorsements: 0,
};

/**
 * 0–100 trust score. Weights favour independent verification (attestation and
 * replication) over raw completion, and penalise slips. A subject with no track
 * record sits at the 40 baseline ("Developing"/"Unproven" boundary).
 */
export function reputationScore(c: ReputationCounts): number {
  const raw =
    40 +
    7 * c.completed +
    9 * c.attested +
    11 * c.replicated +
    6 * c.dealsLed +
    5 * c.endorsements -
    14 * c.slipped;
  return clamp(Math.round(raw), 0, 100);
}

export function reputationBand(score: number): ReputationBand {
  if (score >= 80) return 'Exceptional';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Developing';
  return 'Unproven';
}
