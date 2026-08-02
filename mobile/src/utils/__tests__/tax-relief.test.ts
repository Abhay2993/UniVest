import {
  applicableSchemes,
  bestScheme,
  formatSchemeMoney,
  reliefFor,
  TAX_SCHEMES,
} from '../tax-relief';
import { STARTUPS } from '../../data/mock';

const seis = TAX_SCHEMES.find((s) => s.code === 'uk_seis')!;
const qsbs = TAX_SCHEMES.find((s) => s.code === 'us_qsbs')!;

describe('tax relief — formula + caps', () => {
  it('computes relief = amount × rate', () => {
    expect(reliefFor(seis, 50000).reliefAmount).toBe(25000); // 50%
  });

  it('clips at the annual cap and flags it', () => {
    const r = reliefFor(seis, 250000);
    expect(r.eligibleAmount).toBe(200000);
    expect(r.reliefAmount).toBe(100000);
    expect(r.cappedByAnnualLimit).toBe(true);
  });

  it('reduces remaining cap by prior claims', () => {
    const r = reliefFor(seis, 100000, 150000);
    expect(r.eligibleAmount).toBe(50000);
    expect(r.remainingCap).toBe(50000);
  });

  it('treats QSBS as uncapped with no upfront relief', () => {
    const r = reliefFor(qsbs, 1_000_000);
    expect(r.reliefAmount).toBe(0);
    expect(r.remainingCap).toBeNull();
  });
});

describe('tax relief — jurisdiction mapping from deals', () => {
  it('maps UK deals to EIS/SEIS and US deals to QSBS', () => {
    const gb = applicableSchemes('GBR').map((s) => s.code);
    expect(gb).toContain('uk_seis');
    expect(gb).toContain('uk_ki_eis');
    const us = applicableSchemes('USA').map((s) => s.code);
    expect(us).toEqual(['us_qsbs']);
    expect(applicableSchemes('AUS').map((s) => s.code)).toEqual(['au_esic']);
  });

  it('returns no scheme for unsupported jurisdictions', () => {
    expect(applicableSchemes('CHE')).toHaveLength(0); // Switzerland — not modeled
    expect(applicableSchemes('NLD')).toHaveLength(0);
  });

  it('picks the most generous scheme (SEIS 50% over KI-EIS 30%)', () => {
    expect(bestScheme(applicableSchemes('GBR'))!.code).toBe('uk_seis');
  });

  it('resolves a real deal to a scheme (Vasca/Oxford = UK)', () => {
    const vasca = STARTUPS.find((s) => s.id === 's3')!; // Oxford (GBR)
    expect(vasca.university.country).toBe('GBR');
    expect(bestScheme(applicableSchemes(vasca.university.country))!.jurisdiction).toBe('GB');
    const helion = STARTUPS.find((s) => s.id === 's1')!; // MIT (USA)
    expect(bestScheme(applicableSchemes(helion.university.country))!.code).toBe('us_qsbs');
  });
});

describe('tax relief — formatting', () => {
  it('formats scheme money with the right symbol', () => {
    expect(formatSchemeMoney(15000, 'GBP')).toBe('£15,000');
    expect(formatSchemeMoney(15000, 'USD')).toBe('$15,000');
    expect(formatSchemeMoney(15000, 'AUD')).toBe('A$15,000');
  });
});
