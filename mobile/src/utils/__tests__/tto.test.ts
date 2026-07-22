import {
  capTableIsValid,
  consortiumTotalCommitted,
  portfolioByVertical,
  portfolioStats,
  SpinoutHolding,
  universityEquityValue,
} from '../tto';
import { CONSORTIA, MIT_PORTFOLIO } from '../../data/university';

function holding(over: Partial<SpinoutHolding>): SpinoutHolding {
  return {
    id: 'x',
    name: 'X',
    vertical: 'Fusion Energy',
    stage: 'Seed',
    onPlatform: true,
    raisedToDate: 0,
    postMoney: 0,
    capTable: { founders: 60, university: 15, optionPool: 10, investors: 15 },
    milestonesCompleted: 0,
    milestonesTotal: 4,
    nextMilestone: '—',
    lastUpdate: '2026-01-01',
    ...over,
  };
}

describe('cap table', () => {
  it('validates a table that sums to ~100', () => {
    expect(capTableIsValid({ founders: 60, university: 15, optionPool: 10, investors: 15 })).toBe(true);
    expect(capTableIsValid({ founders: 60, university: 15, optionPool: 10, investors: 5 })).toBe(false);
  });
});

describe('universityEquityValue', () => {
  it('is post-money weighted by the university stake', () => {
    const holdings = [
      holding({ postMoney: 10_000_000, capTable: { founders: 70, university: 10, optionPool: 10, investors: 10 } }),
      holding({ postMoney: 20_000_000, capTable: { founders: 60, university: 15, optionPool: 10, investors: 15 } }),
    ];
    // 10M*10% + 20M*15% = 1M + 3M = 4M
    expect(universityEquityValue(holdings)).toBeCloseTo(4_000_000, 6);
  });
});

describe('portfolioStats', () => {
  it('separates on/off-platform and rolls up value + progress', () => {
    const holdings = [
      holding({ onPlatform: true, raisedToDate: 1_000_000, postMoney: 10_000_000, milestonesCompleted: 2, milestonesTotal: 4 }),
      holding({ onPlatform: false, raisedToDate: 5_000_000, postMoney: 30_000_000, milestonesCompleted: 3, milestonesTotal: 6 }),
    ];
    const s = portfolioStats(holdings);
    expect(s.count).toBe(2);
    expect(s.onPlatform).toBe(1);
    expect(s.offPlatform).toBe(1);
    expect(s.totalRaised).toBe(6_000_000);
    expect(s.portfolioValue).toBe(40_000_000);
    expect(s.avgProgress).toBeCloseTo((0.5 + 0.5) / 2, 6); // both 50%
  });

  it('handles the real MIT portfolio (on-platform < total)', () => {
    const s = portfolioStats(MIT_PORTFOLIO);
    expect(s.count).toBe(MIT_PORTFOLIO.length);
    expect(s.onPlatform).toBeGreaterThan(0);
    expect(s.offPlatform).toBeGreaterThan(0); // the OS tracks companies it didn't fund
    expect(s.universityEquityValue).toBeGreaterThan(0);
  });
});

describe('portfolioByVertical', () => {
  it('weights by post-money and sums to 1', () => {
    const rows = portfolioByVertical(MIT_PORTFOLIO);
    const sum = rows.reduce((s, r) => s + r.weight, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe('consortia', () => {
  it('sums committed capital across vehicles', () => {
    expect(consortiumTotalCommitted(CONSORTIA)).toBe(
      CONSORTIA.reduce((s, c) => s + c.committedCapital, 0),
    );
  });

  it('each consortium has a lead that is also a member', () => {
    for (const c of CONSORTIA) {
      expect(c.members).toContain(c.leadUniversity);
      expect(c.members.length).toBeGreaterThanOrEqual(2); // cross-university by definition
    }
  });
});
