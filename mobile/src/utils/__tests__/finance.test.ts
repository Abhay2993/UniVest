import {
  clearUniformPrice,
  computeInvestmentLimit,
  tvpi,
  xirr,
} from '../finance';

const YEAR = 365.25 * 86_400_000;

describe('xirr', () => {
  it('matches the closed form for a single 2-year 1.5x flow', () => {
    const rate = xirr([
      { date: 0, amount: -1_000 },
      { date: 2 * YEAR, amount: 1_500 },
    ]);
    expect(rate).not.toBeNull();
    expect(rate!).toBeCloseTo(Math.sqrt(1.5) - 1, 6);
  });

  it('finds a root (NPV ≈ 0) for staggered multi-flow', () => {
    const flows = [
      { date: 0, amount: -1_000 },
      { date: YEAR, amount: -500 },
      { date: 2 * YEAR, amount: 2_200 },
    ];
    const rate = xirr(flows)!;
    const npv = flows.reduce((s, f) => s + f.amount / Math.pow(1 + rate, f.date / YEAR), 0);
    expect(Math.abs(npv)).toBeLessThan(1e-5);
  });

  it('returns null without a sign change', () => {
    expect(xirr([{ date: 0, amount: -1 }, { date: YEAR, amount: -2 }])).toBeNull();
  });
});

describe('tvpi', () => {
  it('computes (value + distributions) / paid-in', () => {
    expect(tvpi(3_312.5, 0, 2_500)).toBeCloseTo(1.325, 9);
    expect(tvpi(1_000, 500, 1_000)).toBeCloseTo(1.5, 9);
  });
});

describe('clearUniformPrice', () => {
  const referenceBook = [
    { side: 'buy' as const, units: 100, limitPrice: 13.0 },
    { side: 'buy' as const, units: 200, limitPrice: 12.5 },
    { side: 'buy' as const, units: 150, limitPrice: 12.0 },
    { side: 'sell' as const, units: 120, limitPrice: 11.5 },
    { side: 'sell' as const, units: 180, limitPrice: 12.25 },
    { side: 'sell' as const, units: 200, limitPrice: 12.75 },
  ];

  it('clears the reference book at the plateau midpoint (matches clear_auction SQL)', () => {
    expect(clearUniformPrice(referenceBook)).toEqual({ price: 12.375, volume: 300 });
  });

  it('returns no cross when best bid < best ask', () => {
    expect(
      clearUniformPrice([
        { side: 'buy', units: 10, limitPrice: 5 },
        { side: 'sell', units: 10, limitPrice: 9 },
      ]),
    ).toEqual({ price: null, volume: 0 });
  });
});

describe('computeInvestmentLimit (Reg CF)', () => {
  it.each([
    [50_000, 30_000, 2_500],
    [100_000, 120_000, 6_000],
    [200_000, 50_000, 20_000],
    [300_000, 2_000_000, 124_000],
    [124_000, 0, 12_400],
  ])('income %i / net worth %i → %i', (income, netWorth, expected) => {
    expect(computeInvestmentLimit(income, netWorth)).toBe(expected);
  });
});
