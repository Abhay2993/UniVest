import {
  ftoAssessment,
  Patent,
  replicationSummary,
  ReplicationStudy,
  talentSignal,
  TalentMove,
} from '../diligence';
import { FTO_PATENTS, REPLICATION_STUDIES, TALENT_MOVES } from '../../data/diligence';

const rep = (status: ReplicationStudy['status']): ReplicationStudy => ({
  id: Math.random().toString(),
  milestoneTitle: 'm',
  labName: 'lab',
  fee: 1000,
  status,
});

describe('replicationSummary', () => {
  it('flags verified-by-replication once a study succeeds', () => {
    const s = replicationSummary([rep('replicated'), rep('available'), rep('in_progress')]);
    expect(s.verifiedByReplication).toBe(true);
    expect(s.replicated).toBe(1);
    expect(s.available).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.replicationRate).toBeCloseTo(1 / 3, 6);
  });

  it('is not verified when nothing has replicated', () => {
    expect(replicationSummary([rep('available'), rep('in_progress')]).verifiedByReplication).toBe(false);
  });

  it('Helion has a genuine replication (real mock data)', () => {
    expect(replicationSummary(REPLICATION_STUDIES.s1).verifiedByReplication).toBe(true);
  });
});

describe('ftoAssessment', () => {
  const owned = (r: Patent['relation']): Patent => ({
    id: Math.random().toString(),
    title: 't',
    assignee: 'a',
    relation: r,
    jurisdiction: 'US',
  });

  it('is fully clear with no blocking or adjacent patents', () => {
    const a = ftoAssessment([owned('owned'), owned('licensed')]);
    expect(a.clearanceScore).toBe(100);
    expect(a.band).toBe('Clear');
    expect(a.owned).toBe(2);
  });

  it('a blocking patent drops the score by 25', () => {
    expect(ftoAssessment([owned('owned'), owned('blocking')]).clearanceScore).toBe(75);
  });

  it('two blocking + one adjacent → Contested', () => {
    const a = ftoAssessment([owned('blocking'), owned('blocking'), owned('adjacent')]);
    expect(a.clearanceScore).toBe(44); // 100 - 50 - 6
    expect(a.band).toBe('Contested');
  });

  it('the real Qubit Foundry landscape has one blocking patent', () => {
    const a = ftoAssessment(FTO_PATENTS.s2);
    expect(a.blocking).toBe(1);
    expect(a.clearanceScore).toBe(75);
  });
});

describe('talentSignal', () => {
  const move = (p: TalentMove['pedigree']): TalentMove => ({
    id: Math.random().toString(),
    name: 'n',
    role: 'r',
    fromOrg: 'o',
    pedigree: p,
    joinedDate: '2026-01-01',
  });

  it('weights by pedigree and counts stars', () => {
    const s = talentSignal([move('star'), move('star'), move('star')]);
    expect(s.stars).toBe(3);
    expect(s.strength).toBe(90); // 3*3*10, capped at 100
  });

  it('caps strength at 100', () => {
    expect(talentSignal([move('star'), move('star'), move('star'), move('star')]).strength).toBe(100);
  });

  it('the real Helion talent inflow is a strong signal', () => {
    expect(talentSignal(TALENT_MOVES.s1).strength).toBeGreaterThanOrEqual(60);
  });
});
