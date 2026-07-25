import {
  ANGEL_MIN_TICKET,
  clampCarry,
  isAngelEligible,
  leadEconomics,
} from '../angel';

describe('angel economics', () => {
  it('bounds carry to [0, 30]', () => {
    expect(clampCarry(20)).toBe(20);
    expect(clampCarry(45)).toBe(30);
    expect(clampCarry(-5)).toBe(0);
    expect(clampCarry(Number.NaN)).toBe(20); // falls back to default
  });

  it('computes lead economics at a 3× exit', () => {
    // Lead commits 50k, brings a 200k follower pool, 20% carry, 3× exit.
    const e = leadEconomics(50_000, 200_000, 20, 3);
    expect(e.ownReturn).toBe(150_000);
    expect(e.ownProfit).toBe(100_000);
    expect(e.followerProfit).toBe(400_000);
    expect(e.carryEarned).toBe(80_000); // 20% of 400k
    expect(e.totalToLead).toBe(230_000); // 150k own + 80k carry
  });

  it('earns no carry when the deal only returns capital', () => {
    const e = leadEconomics(50_000, 200_000, 20, 1);
    expect(e.ownProfit).toBe(0);
    expect(e.followerProfit).toBe(0);
    expect(e.carryEarned).toBe(0);
    expect(e.totalToLead).toBe(50_000);
  });

  it('respects the carry bound inside the economics', () => {
    // Carry passed as 50 is clamped to 30 before it is applied.
    const e = leadEconomics(10_000, 100_000, 50, 2);
    expect(e.carryEarned).toBe(30_000); // 30% of 100k follower profit
  });

  it('gates eligibility on accreditation', () => {
    expect(isAngelEligible('none')).toBe(false);
    expect(isAngelEligible('accredited')).toBe(true);
    expect(isAngelEligible('qualified_purchaser')).toBe(true);
  });

  it('exposes a positive minimum ticket', () => {
    expect(ANGEL_MIN_TICKET).toBeGreaterThan(0);
  });
});
