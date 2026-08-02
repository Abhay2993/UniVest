/**
 * Tax-relief math + scheme reference — pure, unit-tested. Mirrors the backend
 * tax-relief service (one relief formula governs both). Which scheme applies is
 * decided by the investor's / deal's jurisdiction; here we compute the relief for
 * an amount respecting the scheme's per-investor annual cap.
 */

export interface TaxScheme {
  code: string;
  name: string;
  jurisdiction: string; // 2-letter tax residency the scheme applies to
  incomeReliefPct: number;
  annualCap: number | null;
  capCurrency: string;
  minHoldMonths: number;
  cgtExempt: boolean;
  lossRelief: boolean;
  certificateKind: string;
}

/** Mirrors backend/db seed `tax_schemes`. */
export const TAX_SCHEMES: TaxScheme[] = [
  { code: 'uk_seis', name: 'UK SEIS', jurisdiction: 'GB', incomeReliefPct: 50, annualCap: 200000, capCurrency: 'GBP', minHoldMonths: 36, cgtExempt: true, lossRelief: true, certificateKind: 'SEIS3' },
  { code: 'uk_eis', name: 'UK EIS', jurisdiction: 'GB', incomeReliefPct: 30, annualCap: 1000000, capCurrency: 'GBP', minHoldMonths: 36, cgtExempt: true, lossRelief: true, certificateKind: 'EIS3' },
  { code: 'uk_ki_eis', name: 'UK EIS (Knowledge-Intensive)', jurisdiction: 'GB', incomeReliefPct: 30, annualCap: 2000000, capCurrency: 'GBP', minHoldMonths: 36, cgtExempt: true, lossRelief: true, certificateKind: 'EIS3-KI' },
  { code: 'au_esic', name: 'AU ESIC', jurisdiction: 'AU', incomeReliefPct: 20, annualCap: 200000, capCurrency: 'AUD', minHoldMonths: 12, cgtExempt: true, lossRelief: false, certificateKind: 'ESIC statement' },
  { code: 'us_qsbs', name: 'US QSBS (Section 1202)', jurisdiction: 'US', incomeReliefPct: 0, annualCap: null, capCurrency: 'USD', minHoldMonths: 60, cgtExempt: true, lossRelief: false, certificateKind: 'QSBS attestation' },
  { code: 'fr_ir_pme', name: 'FR IR-PME', jurisdiction: 'FR', incomeReliefPct: 25, annualCap: 50000, capCurrency: 'EUR', minHoldMonths: 60, cgtExempt: false, lossRelief: false, certificateKind: 'IR-PME statement' },
];

/** The app's 3-letter university country codes → scheme jurisdiction (2-letter). */
const COUNTRY_TO_JURISDICTION: Record<string, string> = {
  USA: 'US',
  GBR: 'GB',
  AUS: 'AU',
  FRA: 'FR',
};

export const CURRENCY_SYMBOL: Record<string, string> = { GBP: '£', USD: '$', AUD: 'A$', EUR: '€' };

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ReliefResult {
  eligibleAmount: number;
  reliefAmount: number;
  cappedByAnnualLimit: boolean;
  remainingCap: number | null;
  effectiveReliefPct: number;
}

export function reliefFor(scheme: TaxScheme, amount: number, priorClaimedThisYear = 0): ReliefResult {
  const uncapped = scheme.annualCap == null;
  const remainingCap = uncapped ? null : Math.max((scheme.annualCap as number) - priorClaimedThisYear, 0);
  const eligibleAmount = uncapped ? amount : Math.min(amount, remainingCap as number);
  const reliefAmount = round2((eligibleAmount * scheme.incomeReliefPct) / 100);
  return {
    eligibleAmount: round2(eligibleAmount),
    reliefAmount,
    cappedByAnnualLimit: !uncapped && amount > (remainingCap as number),
    remainingCap: remainingCap == null ? null : round2(remainingCap),
    effectiveReliefPct: amount > 0 ? round2((reliefAmount / amount) * 100) : 0,
  };
}

/** Schemes available to an investor/deal in a given app country code (e.g. 'GBR'). */
export function applicableSchemes(countryCode: string): TaxScheme[] {
  const juris = COUNTRY_TO_JURISDICTION[countryCode];
  if (!juris) return [];
  return TAX_SCHEMES.filter((s) => s.jurisdiction === juris);
}

/** Most generous applicable scheme (highest relief rate, then larger cap). */
export function bestScheme(schemes: TaxScheme[]): TaxScheme | null {
  if (schemes.length === 0) return null;
  return [...schemes].sort((a, b) => {
    if (b.incomeReliefPct !== a.incomeReliefPct) return b.incomeReliefPct - a.incomeReliefPct;
    const ca = a.annualCap ?? Infinity;
    const cb = b.annualCap ?? Infinity;
    return cb - ca;
  })[0];
}

export function formatSchemeMoney(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  return `${sym}${Math.round(amount).toLocaleString('en-US')}`;
}
