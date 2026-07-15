/**
 * Financial math for portfolio analytics and the batch-auction market.
 * Pure TypeScript — no React Native imports — so it can be unit-tested in Node.
 */

export interface CashFlow {
  /** Milliseconds since epoch. */
  date: number;
  /** Negative = money in (investment), positive = money out (value/distribution). */
  amount: number;
}

const MS_PER_YEAR = 365.25 * 86_400_000;

/**
 * XIRR — annualized internal rate of return for irregular cash flows.
 * Newton–Raphson with a bisection fallback; returns null when no sign change
 * exists or the iteration fails to converge.
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasNegative = flows.some((f) => f.amount < 0);
  const hasPositive = flows.some((f) => f.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const t0 = flows[0].date;
  const years = flows.map((f) => (f.date - t0) / MS_PER_YEAR);

  const npv = (rate: number) =>
    flows.reduce((sum, f, i) => sum + f.amount / Math.pow(1 + rate, years[i]), 0);
  const dNpv = (rate: number) =>
    flows.reduce(
      (sum, f, i) => sum - (years[i] * f.amount) / Math.pow(1 + rate, years[i] + 1),
      0,
    );

  // Newton–Raphson from a sensible seed.
  let rate = 0.1;
  for (let i = 0; i < 50; i++) {
    const value = npv(rate);
    if (Math.abs(value) < 1e-7) return rate;
    const slope = dNpv(rate);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Bisection fallback over a wide bracket.
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  if (fLo * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** TVPI / MOIC: (current value + distributions) / paid-in capital. */
export function tvpi(currentValue: number, distributions: number, paidIn: number): number {
  if (paidIn <= 0) return 0;
  return (currentValue + distributions) / paidIn;
}

/**
 * Reg CF annual investment limit (post-2021 SEC thresholds):
 * if either annual income or net worth ≥ $124,000 → 10% of the greater,
 * capped at $124,000; otherwise the greater of $2,500 or 5% of the greater.
 * The backend applies the same formula server-side; this mirror powers the
 * onboarding result screen.
 */
export function computeInvestmentLimit(annualIncome: number, netWorth: number): number {
  const THRESHOLD = 124_000;
  const CAP = 124_000;
  const FLOOR = 2_500;
  const greater = Math.max(annualIncome, netWorth);
  if (annualIncome >= THRESHOLD || netWorth >= THRESHOLD) {
    return Math.min(Math.round(greater * 0.1), CAP);
  }
  return Math.max(FLOOR, Math.round(greater * 0.05));
}

export interface BookOrder {
  side: 'buy' | 'sell';
  units: number;
  limitPrice: number;
}

export interface ClearingResult {
  /** Uniform clearing price (midpoint of the max-volume plateau); null if no cross. */
  price: number | null;
  /** Executed volume at that price. */
  volume: number;
}

/**
 * Uniform-price batch-auction clearing — the TypeScript mirror of the
 * database's clear_auction() function: price maximizing min(demand, supply),
 * midpoint of the max-volume plateau on ties.
 */
export function clearUniformPrice(orders: BookOrder[]): ClearingResult {
  const candidates = [...new Set(orders.map((o) => o.limitPrice))].sort((a, b) => a - b);
  let bestVolume = 0;
  let priceLo: number | null = null;
  let priceHi: number | null = null;

  for (const p of candidates) {
    const demand = orders
      .filter((o) => o.side === 'buy' && o.limitPrice >= p)
      .reduce((s, o) => s + o.units, 0);
    const supply = orders
      .filter((o) => o.side === 'sell' && o.limitPrice <= p)
      .reduce((s, o) => s + o.units, 0);
    const volume = Math.min(demand, supply);
    if (volume > bestVolume) {
      bestVolume = volume;
      priceLo = p;
      priceHi = p;
    } else if (volume === bestVolume && bestVolume > 0) {
      priceHi = p; // max-volume plateau is contiguous
    }
  }

  if (bestVolume === 0 || priceLo === null || priceHi === null) {
    return { price: null, volume: 0 };
  }
  return { price: (priceLo + priceHi) / 2, volume: bestVolume };
}
