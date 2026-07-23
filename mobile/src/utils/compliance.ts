/**
 * Multi-jurisdiction compliance engine — the regulatory moat. Each regime a
 * competitor must rebuild from scratch; deep-tech is global, so covering more
 * of them widens the surface they can't match. Pure + unit-tested.
 *
 * Amounts and thresholds are illustrative encodings of the headline retail
 * rules, not legal advice — the point is that the engine is pluggable: adding
 * a regime is a data entry, and every downstream limit / cooling-off /
 * consent check reads from here.
 */
import { computeInvestmentLimit } from './finance';
import { CurrencyCode } from './format';

export type JurisdictionId = 'US' | 'EU' | 'UK' | 'CA' | 'SG' | 'AU';

export interface CoolingOff {
  /** before_close: cancel until N hours before the round closes (Reg CF style).
   *  reflection:   withdraw within an N-hour reflection window from commitment. */
  kind: 'before_close' | 'reflection';
  hours: number;
  label: string;
}

export interface Regime {
  id: JurisdictionId;
  country: string;
  regulator: string;
  framework: string;
  currency: CurrencyCode;
  coolingOff: CoolingOff;
  /** Requires an explicit affordability confirmation above the soft threshold. */
  expressConsent: boolean;
  /** Annual investment cap given self-reported income and net worth. */
  annualLimit: (income: number, netWorth: number) => number;
  disclosure: string;
}

const DAY = 24;

export const REGIMES: Record<JurisdictionId, Regime> = {
  US: {
    id: 'US',
    country: 'United States',
    regulator: 'SEC',
    framework: 'Reg CF',
    currency: 'USD',
    coolingOff: { kind: 'before_close', hours: 48, label: 'cancel until 48h before close' },
    expressConsent: false,
    annualLimit: (income, netWorth) => computeInvestmentLimit(income, netWorth),
    disclosure: 'Reg CF limits are tiered on income and net worth (10% / 5%), capped at $124,000.',
  },
  EU: {
    id: 'EU',
    country: 'European Union',
    regulator: 'ESMA',
    framework: 'ECSPR',
    currency: 'EUR',
    coolingOff: { kind: 'reflection', hours: 4 * DAY, label: '4-day reflection period' },
    expressConsent: true,
    // Non-sophisticated: warning + express consent above max(€1,000, 5% of net worth).
    annualLimit: (_income, netWorth) => Math.max(1_000, Math.round(0.05 * netWorth)),
    disclosure: 'ECSPR requires express consent above the greater of €1,000 or 5% of net worth.',
  },
  UK: {
    id: 'UK',
    country: 'United Kingdom',
    regulator: 'FCA',
    framework: 'Restricted Investor',
    currency: 'GBP',
    coolingOff: { kind: 'reflection', hours: 14 * DAY, label: '14-day cancellation period' },
    expressConsent: true,
    // Restricted investors self-certify to ≤10% of net assets in high-risk investments.
    annualLimit: (_income, netWorth) => Math.round(0.1 * netWorth),
    disclosure: 'FCA restricted investors self-certify to ≤10% of net assets in high-risk investments.',
  },
  CA: {
    id: 'CA',
    country: 'Canada',
    regulator: 'CSA',
    framework: 'NI 45-110',
    currency: 'CAD',
    coolingOff: { kind: 'before_close', hours: 48, label: 'cancel within 48h of commitment' },
    expressConsent: false,
    // Non-eligible investors: C$2,500 per deal, C$10,000 per calendar year.
    annualLimit: () => 10_000,
    disclosure: 'NI 45-110 caps non-eligible investors at C$2,500 per offering and C$10,000 per year.',
  },
  SG: {
    id: 'SG',
    country: 'Singapore',
    regulator: 'MAS',
    framework: 'Securities-based Crowdfunding',
    currency: 'SGD',
    coolingOff: { kind: 'reflection', hours: 5 * DAY, label: '5-day withdrawal window' },
    expressConsent: true,
    // Retail (non-accredited) modeled at a conservative annual cap.
    annualLimit: (_income, netWorth) => (netWorth >= 2_000_000 ? 200_000 : 15_000),
    disclosure: 'MAS distinguishes accredited investors (S$2M net worth) from a conservative retail cap.',
  },
  AU: {
    id: 'AU',
    country: 'Australia',
    regulator: 'ASIC',
    framework: 'CSF',
    currency: 'AUD',
    coolingOff: { kind: 'reflection', hours: 5 * DAY, label: '5-day cooling-off (CSF)' },
    expressConsent: false,
    // CSF retail cap: A$10,000 per company per 12 months.
    annualLimit: () => 10_000,
    disclosure: 'ASIC CSF caps retail investors at A$10,000 per company per 12 months.',
  },
};

export const JURISDICTION_IDS = Object.keys(REGIMES) as JurisdictionId[];

export function resolveRegime(id: JurisdictionId): Regime {
  return REGIMES[id];
}

/** Maps an ISO country code (from onboarding) to a supported regime. */
export function regimeForCountry(countryCode: string): JurisdictionId {
  const map: Record<string, JurisdictionId> = {
    USA: 'US',
    GBR: 'UK',
    CAN: 'CA',
    SGP: 'SG',
    AUS: 'AU',
    DEU: 'EU',
    NLD: 'EU',
    FRA: 'EU',
    CHE: 'EU', // Swiss deep-tech routed to the EU regime for this demo
  };
  return map[countryCode] ?? 'US';
}

/**
 * The instant a commitment stops being cancellable under the regime:
 *   before_close → close − window; reflection → min(now + window, close).
 */
export function coolingOffCancellableUntil(
  id: JurisdictionId,
  nowMs: number,
  closesAtMs: number,
): number {
  const { coolingOff } = REGIMES[id];
  const windowMs = coolingOff.hours * 3_600_000;
  return coolingOff.kind === 'before_close'
    ? closesAtMs - windowMs
    : Math.min(nowMs + windowMs, closesAtMs);
}
