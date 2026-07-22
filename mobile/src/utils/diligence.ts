/**
 * Scientific-diligence scoring — the domain moat retail platforms can't touch.
 * Pure, unit-tested functions over three signals:
 *   1. Independent replication (stronger than attestation: a third-party lab
 *      reproduced the result for a fee — "verified by replication").
 *   2. Freedom-to-operate (patent-landscape clearance).
 *   3. Talent flow (which star researchers are joining — a leading indicator).
 */

// ---------------------------------------------------------------------------
// 1) Independent replication marketplace
// ---------------------------------------------------------------------------
export type ReplicationStatus =
  | 'available' // a lab offers to replicate; not yet commissioned
  | 'commissioned'
  | 'in_progress'
  | 'replicated' // reproduced successfully
  | 'inconclusive';

export interface ReplicationStudy {
  id: string;
  milestoneTitle: string;
  labName: string;
  fee: number;
  status: ReplicationStatus;
  result?: string;
  completedDate?: string;
}

export interface ReplicationSummary {
  total: number;
  replicated: number;
  available: number;
  inProgress: number;
  /** True once at least one milestone has been independently reproduced. */
  verifiedByReplication: boolean;
  /** Share of studies that reached a successful replication, 0..1. */
  replicationRate: number;
}

export function replicationSummary(studies: ReplicationStudy[]): ReplicationSummary {
  const replicated = studies.filter((s) => s.status === 'replicated').length;
  return {
    total: studies.length,
    replicated,
    available: studies.filter((s) => s.status === 'available').length,
    inProgress: studies.filter((s) => s.status === 'commissioned' || s.status === 'in_progress')
      .length,
    verifiedByReplication: replicated > 0,
    replicationRate: studies.length === 0 ? 0 : replicated / studies.length,
  };
}

// ---------------------------------------------------------------------------
// 2) Freedom-to-operate (patent landscape)
// ---------------------------------------------------------------------------
export type PatentRelation = 'owned' | 'licensed' | 'blocking' | 'adjacent';

export interface Patent {
  id: string;
  title: string;
  assignee: string;
  relation: PatentRelation;
  jurisdiction: string;
}

export interface FTOAssessment {
  owned: number; // owned + licensed = the defensive estate
  blocking: number; // patents that could block operation
  adjacent: number; // near the design; may need a work-around
  /** 0 (contested) – 100 (clear). Blocking patents dominate. */
  clearanceScore: number;
  band: 'Clear' | 'Moderate' | 'Contested';
}

export function ftoAssessment(patents: Patent[]): FTOAssessment {
  const owned = patents.filter((p) => p.relation === 'owned' || p.relation === 'licensed').length;
  const blocking = patents.filter((p) => p.relation === 'blocking').length;
  const adjacent = patents.filter((p) => p.relation === 'adjacent').length;
  const clearanceScore = clamp(100 - 25 * blocking - 6 * adjacent, 0, 100);
  const band: FTOAssessment['band'] =
    clearanceScore >= 75 ? 'Clear' : clearanceScore >= 50 ? 'Moderate' : 'Contested';
  return { owned, blocking, adjacent, clearanceScore, band };
}

// ---------------------------------------------------------------------------
// 3) Talent flow
// ---------------------------------------------------------------------------
export type Pedigree = 'star' | 'senior' | 'notable';

export interface TalentMove {
  id: string;
  name: string;
  role: string;
  /** Where they came from (a lab or program). */
  fromOrg: string;
  pedigree: Pedigree;
  joinedDate: string;
}

const PEDIGREE_WEIGHT: Record<Pedigree, number> = { star: 3, senior: 2, notable: 1 };

export interface TalentSignal {
  hires: number;
  stars: number;
  /** 0..100 — weighted by pedigree, a leading quality indicator. */
  strength: number;
}

export function talentSignal(moves: TalentMove[]): TalentSignal {
  const weight = moves.reduce((s, m) => s + PEDIGREE_WEIGHT[m.pedigree], 0);
  return {
    hires: moves.length,
    stars: moves.filter((m) => m.pedigree === 'star').length,
    strength: Math.min(100, weight * 10),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}
