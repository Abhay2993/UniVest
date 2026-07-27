/**
 * Reputation scoring — pure, unit-tested. Mirrors the backend reputation service
 * (one formula governs both): an actor's on-platform track record — executed and
 * independently-attested milestones, replications that held up, endorsements —
 * rolls into a 0–100 trust score. Slips subtract.
 */
import { Startup } from '../types';
import { REPLICATION_STUDIES } from '../data/diligence';
import { FOUNDER_ENDORSEMENTS } from '../data/reputation';
import { GRAPH_NODES, neighborsOf } from '../data/graph';

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

/** 0–100 trust score; independent verification (attestation, replication) is weighted highest. */
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

/** The founder's name for a deal, resolved from the knowledge graph. */
export function founderName(startup: Startup): string {
  const node = GRAPH_NODES.find((n) => n.kind === 'startup' && n.startupId === startup.id);
  const f = node ? neighborsOf(node.id).find((x) => x.edge === 'founded by') : undefined;
  return f?.node.label ?? 'Founding team';
}

/** Derive a founder's reputation counts from the deal's execution record. */
export function founderCountsFromStartup(startup: Startup): ReputationCounts {
  const completed = startup.milestones.filter((m) => m.status === 'completed').length;
  const attested = startup.milestones.filter((m) => m.status === 'completed' && m.attestation).length;
  const replicated = (REPLICATION_STUDIES[startup.id] ?? []).filter(
    (r) => r.status === 'replicated',
  ).length;
  const endorsements = (FOUNDER_ENDORSEMENTS[startup.id] ?? []).length;
  return { completed, attested, replicated, slipped: 0, dealsLed: 0, endorsements };
}

export interface FounderReputation {
  name: string;
  score: number;
  band: ReputationBand;
  counts: ReputationCounts;
}

/** Full founder trust profile for a deal (name, score, band, breakdown). */
export function founderReputation(startup: Startup): FounderReputation {
  const counts = founderCountsFromStartup(startup);
  const score = reputationScore(counts);
  return { name: founderName(startup), score, band: reputationBand(score), counts };
}
