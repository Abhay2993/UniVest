import {
  exposureBy,
  isLongTerm,
  moic,
  portfolioMetrics,
  stageFromMilestones,
} from '../portfolio-analytics';

describe('portfolio analytics', () => {
  const positions = [
    { currentValue: 3000, costBasis: 2000, vertical: 'MedTech', country: 'US' },
    { currentValue: 1000, costBasis: 800, vertical: 'MedTech', country: 'GBR' },
    { currentValue: 1000, costBasis: 1200, vertical: 'Fusion Energy', country: 'US' },
  ];

  it('computes MOIC', () => {
    expect(moic(3000, 2000)).toBe(1.5);
    expect(moic(1000, 0)).toBe(0);
  });

  it('aggregates exposure by a key with shares of total value', () => {
    const byVertical = exposureBy(positions, (p) => p.vertical);
    // MedTech = 3000+1000 = 4000 of 5000 → 80%; Fusion = 1000 → 20%.
    expect(byVertical[0]).toEqual({ key: 'MedTech', value: 4000, pct: 80 });
    expect(byVertical[1]).toEqual({ key: 'Fusion Energy', value: 1000, pct: 20 });
  });

  it('sorts exposure from largest to smallest', () => {
    const byGeo = exposureBy(positions, (p) => p.country);
    expect(byGeo.map((s) => s.key)).toEqual(['US', 'GBR']); // 4000 vs 1000
  });

  it('rolls up portfolio metrics with TVPI and gain', () => {
    const m = portfolioMetrics(positions, 500);
    expect(m.paidIn).toBe(4000);
    expect(m.currentValue).toBe(5000);
    expect(m.totalValue).toBe(5500); // + 500 distributions
    expect(m.tvpi).toBe(1.375);
    expect(m.totalGain).toBe(1500);
  });

  it('labels stage from completed milestones', () => {
    expect(stageFromMilestones(0)).toBe('Pre-seed');
    expect(stageFromMilestones(1)).toBe('Seed');
    expect(stageFromMilestones(2)).toBe('Series A');
    expect(stageFromMilestones(4)).toBe('Growth');
  });

  it('classifies holding period at the one-year boundary', () => {
    const acquired = Date.parse('2025-01-01');
    expect(isLongTerm(acquired, Date.parse('2025-12-01'))).toBe(false);
    expect(isLongTerm(acquired, Date.parse('2026-02-01'))).toBe(true);
  });
});
