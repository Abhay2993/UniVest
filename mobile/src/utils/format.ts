/**
 * Locale- and currency-aware formatting. Mock amounts are USD-denominated;
 * the active currency config (set by SettingsContext) converts and formats
 * every money display — switch to EUR and the whole app re-renders in euros
 * with German number formatting.
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'SGD' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  locale: string;
  /** Demo conversion rate; production quotes this from the payments provider. */
  rateFromUSD: number;
  symbol: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', locale: 'en-US', rateFromUSD: 1, symbol: '$' },
  EUR: { code: 'EUR', locale: 'de-DE', rateFromUSD: 0.92, symbol: '€' },
  GBP: { code: 'GBP', locale: 'en-GB', rateFromUSD: 0.79, symbol: '£' },
  CAD: { code: 'CAD', locale: 'en-CA', rateFromUSD: 1.36, symbol: 'C$' },
  SGD: { code: 'SGD', locale: 'en-SG', rateFromUSD: 1.34, symbol: 'S$' },
  AUD: { code: 'AUD', locale: 'en-AU', rateFromUSD: 1.52, symbol: 'A$' },
};

let active: CurrencyConfig = CURRENCIES.USD;

export function setActiveCurrency(code: CurrencyCode): void {
  active = CURRENCIES[code];
}

export function getActiveCurrency(): CurrencyConfig {
  return active;
}

function convert(amountUSD: number): number {
  return amountUSD * active.rateFromUSD;
}

/** "$1,870,000" / "1.870.000 €" — full precision for commitment rows. */
export function formatMoney(amountUSD: number): string {
  return new Intl.NumberFormat(active.locale, {
    style: 'currency',
    currency: active.code,
    maximumFractionDigits: 0,
  }).format(Math.round(convert(amountUSD)));
}

/** "$1.87M" / "€1.72M" — compact form for dense card layouts. */
export function formatMoneyCompact(amountUSD: number): string {
  const v = convert(amountUSD);
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${active.symbol}${m >= 10 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (v >= 1_000) return `${active.symbol}${Math.round(v / 1_000)}K`;
  return formatMoney(amountUSD);
}

/** "74.8%" with one decimal, clamped to [0, 100]. */
export function formatPct(ratio: number): string {
  return `${(Math.min(Math.max(ratio, 0), 1) * 100).toFixed(1)}%`;
}

/** "12 Jun 2025" / "12. Juni 2025" from an ISO date string. */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(active.locale === 'en-US' ? 'en-GB' : active.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
