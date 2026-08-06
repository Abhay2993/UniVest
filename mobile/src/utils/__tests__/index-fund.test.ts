import {
  allocateBudget,
  attestedMilestoneCount,
  indexComposition,
} from '../index-fund';
import { STARTUPS } from '../../data/mock';

const helion = STARTUPS.find((s) => s.id === 's1')!;

describe('index-fund — allocation (water-fill)', () => {
  const three = [
    { startupId: 'a', capacity: 1_000_000 },
    { startupId: 'b', capacity: 1_000_000 },
    { startupId: 'c', capacity: 1_000_000 },
  ];

  it('splits a budget ~evenly with a loose cap', () => {
    const p = allocateBudget(90000, three, 100);
    expect(p.allocations).toHaveLength(3);
    expect(Math.abs(p.deployed - 90000)).toBeLessThan(0.05);
  });

  it('respects a per-deal cap', () => {
    const p = allocateBudget(100000, [{ startupId: 'a', capacity: 1_000_000 }], 25);
    expect(p.deployed).toBe(25000);
    expect(p.undeployed).toBe(75000);
  });

  it('caps at capacity and reports the undeployed remainder', () => {
    const p = allocateBudget(100000, [{ startupId: 'a', capacity: 20000 }, { startupId: 'b', capacity: 15000 }], 100);
    expect(p.deployed).toBe(35000);
    expect(p.undeployed).toBe(65000);
  });

  it('deploys nothing when there are no candidates', () => {
    const p = allocateBudget(50000, [], 50);
    expect(p.allocations).toHaveLength(0);
    expect(p.undeployed).toBe(50000);
  });
});

describe('index-fund — composition + diligence bar', () => {
  it('counts a deal’s attested milestones', () => {
    // Helion has two completed + attested milestones.
    expect(attestedMilestoneCount(helion)).toBe(2);
  });

  it('includes deals meeting the attestation bar and equal-weights them', () => {
    const comp = indexComposition(STARTUPS, { minAttested: 1, verticals: [] });
    expect(comp.count).toBeGreaterThan(0);
    expect(comp.constituents.every((c) => c.attested >= 1)).toBe(true);
    expect(comp.constituents.every((c) => c.capacity > 0)).toBe(true);
    // Equal weights sum to ~100.
    const w = comp.constituents.reduce((a, c) => a + c.weightPct, 0);
    expect(Math.round(w)).toBe(100);
  });

  it('raising the bar shrinks the index', () => {
    const lo = indexComposition(STARTUPS, { minAttested: 1, verticals: [] }).count;
    const hi = indexComposition(STARTUPS, { minAttested: 2, verticals: [] }).count;
    expect(hi).toBeLessThanOrEqual(lo);
  });

  it('filters by vertical', () => {
    const comp = indexComposition(STARTUPS, { minAttested: 0, verticals: ['Fusion Energy'] });
    expect(comp.constituents.every((c) => c.vertical === 'Fusion Energy')).toBe(true);
  });
});
