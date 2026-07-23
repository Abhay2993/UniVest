import {
  coolingOffCancellableUntil,
  JURISDICTION_IDS,
  regimeForCountry,
  REGIMES,
  resolveRegime,
} from '../compliance';

describe('regime registry', () => {
  it('covers six jurisdictions, each well-formed', () => {
    expect(JURISDICTION_IDS).toHaveLength(6);
    for (const id of JURISDICTION_IDS) {
      const r = resolveRegime(id);
      expect(r.regulator).toBeTruthy();
      expect(r.framework).toBeTruthy();
      expect(r.currency).toBeTruthy();
      expect(r.coolingOff.hours).toBeGreaterThan(0);
    }
  });

  it('maps countries to the right regime', () => {
    expect(regimeForCountry('USA')).toBe('US');
    expect(regimeForCountry('GBR')).toBe('UK');
    expect(regimeForCountry('DEU')).toBe('EU');
    expect(regimeForCountry('AUS')).toBe('AU');
    expect(regimeForCountry('ZZZ')).toBe('US'); // unknown → default
  });
});

describe('annual limits per regime', () => {
  it('US Reg CF is income/net-worth tiered', () => {
    expect(REGIMES.US.annualLimit(200_000, 50_000)).toBe(20_000); // 10% of 200k
  });

  it('UK restricted investor is 10% of net assets', () => {
    expect(REGIMES.UK.annualLimit(0, 500_000)).toBe(50_000);
  });

  it('EU ECSPR soft threshold is max(1000, 5% of net worth)', () => {
    expect(REGIMES.EU.annualLimit(0, 10_000)).toBe(1_000); // floor
    expect(REGIMES.EU.annualLimit(0, 100_000)).toBe(5_000);
  });

  it('Canada and Australia use flat retail caps', () => {
    expect(REGIMES.CA.annualLimit(999_999, 999_999)).toBe(10_000);
    expect(REGIMES.AU.annualLimit(999_999, 999_999)).toBe(10_000);
  });

  it('Singapore lifts the cap for accredited net worth', () => {
    expect(REGIMES.SG.annualLimit(0, 100_000)).toBe(15_000);
    expect(REGIMES.SG.annualLimit(0, 2_000_000)).toBe(200_000);
  });
});

describe('cooling-off resolution', () => {
  const now = 1_000_000_000_000;
  const close = now + 30 * 86_400_000; // 30 days out

  it('before_close regimes cancel until N hours before close (US)', () => {
    const until = coolingOffCancellableUntil('US', now, close);
    expect(until).toBe(close - 48 * 3_600_000);
  });

  it('reflection regimes cancel within the window from now (EU 4d)', () => {
    const until = coolingOffCancellableUntil('EU', now, close);
    expect(until).toBe(now + 4 * 24 * 3_600_000);
  });

  it('reflection never extends past the close date', () => {
    const soonClose = now + 2 * 86_400_000; // closes in 2 days
    const until = coolingOffCancellableUntil('UK', now, soonClose); // 14-day window
    expect(until).toBe(soonClose);
  });
});
