import {
  founderCountsFromStartup,
  founderName,
  founderReputation,
  reputationBand,
  reputationScore,
} from '../reputation';
import { STARTUPS } from '../../data/mock';

const helion = STARTUPS.find((s) => s.id === 's1')!;

describe('reputation scoring — formula + bands', () => {
  it('scores an empty record at the 40 baseline', () => {
    const s = reputationScore({ completed: 0, attested: 0, replicated: 0, slipped: 0, dealsLed: 0, endorsements: 0 });
    expect(s).toBe(40);
    expect(reputationBand(s)).toBe('Developing');
  });

  it('weights independent verification above raw completion', () => {
    const raw = reputationScore({ completed: 3, attested: 0, replicated: 0, slipped: 0, dealsLed: 0, endorsements: 0 });
    const verified = reputationScore({ completed: 1, attested: 1, replicated: 1, slipped: 0, dealsLed: 0, endorsements: 0 });
    expect(verified).toBeGreaterThan(raw);
  });

  it('subtracts for slips and floors at zero / Unproven', () => {
    const s = reputationScore({ completed: 1, attested: 0, replicated: 0, slipped: 5, dealsLed: 0, endorsements: 0 });
    expect(s).toBe(0);
    expect(reputationBand(s)).toBe('Unproven');
  });

  it('partitions bands at 80 / 60 / 40', () => {
    expect(reputationBand(80)).toBe('Exceptional');
    expect(reputationBand(60)).toBe('Strong');
    expect(reputationBand(40)).toBe('Developing');
    expect(reputationBand(39)).toBe('Unproven');
  });
});

describe('reputation — founder profile from a deal', () => {
  it('derives counts from executed + attested milestones and replications', () => {
    const c = founderCountsFromStartup(helion);
    // Helion: 2 completed milestones, both attested.
    expect(c.completed).toBe(2);
    expect(c.attested).toBe(2);
    // Two replicated studies + one seeded endorsement.
    expect(c.replicated).toBe(2);
    expect(c.endorsements).toBe(1);
  });

  it('resolves the founder name from the knowledge graph', () => {
    expect(founderName(helion)).toContain('Reyes');
  });

  it('produces an Exceptional trust profile for a proven founder', () => {
    const p = founderReputation(helion);
    expect(p.score).toBe(reputationScore(founderCountsFromStartup(helion)));
    expect(p.score).toBeGreaterThanOrEqual(80);
    expect(p.band).toBe('Exceptional');
  });

  it('works for every deal without throwing', () => {
    for (const s of STARTUPS) {
      const p = founderReputation(s);
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});
