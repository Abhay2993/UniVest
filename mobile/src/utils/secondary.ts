/**
 * Secondary-market economics — pure, unit-tested helpers for the investor
 * order book. A buyer pays a 1.5% admin fee on top of the trade value; the
 * seller receives the trade value. Mirrors the backend match math in
 * backend/api/src/secondary.
 */

/** Buyer-side admin fee on a secondary match (matches the primary market). */
export const SECONDARY_ADMIN_FEE_PCT = 1.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The 1.5% admin fee on a trade value, rounded to cents. */
export function adminFee(tradeValue: number): number {
  return round2(Math.max(0, tradeValue) * (SECONDARY_ADMIN_FEE_PCT / 100));
}

export interface BuyerCost {
  subtotal: number;
  fee: number;
  total: number;
}

/** What a buyer pays for `units` at `price`: subtotal + 1.5% fee. */
export function buyerCost(units: number, price: number): BuyerCost {
  const subtotal = round2(Math.max(0, units) * Math.max(0, price));
  const fee = adminFee(subtotal);
  return { subtotal, fee, total: round2(subtotal + fee) };
}

/** What a seller receives (no buyer-side fee comes out of their proceeds). */
export function sellerProceeds(units: number, price: number): number {
  return round2(Math.max(0, units) * Math.max(0, price));
}

export interface BookLevel {
  price: number;
  units: number;
}

/** Highest bid (best buy price), or null on an empty side. */
export function bestBid(bids: BookLevel[]): number | null {
  if (bids.length === 0) return null;
  return Math.max(...bids.map((b) => b.price));
}

/** Lowest ask (best sell price), or null on an empty side. */
export function bestAsk(asks: BookLevel[]): number | null {
  if (asks.length === 0) return null;
  return Math.min(...asks.map((a) => a.price));
}

/** Ask − bid, or null if either side is empty. */
export function spread(bids: BookLevel[], asks: BookLevel[]): number | null {
  const b = bestBid(bids);
  const a = bestAsk(asks);
  if (b === null || a === null) return null;
  return round2(a - b);
}

/** Midpoint between best bid and best ask, or null if either side is empty. */
export function midPrice(bids: BookLevel[], asks: BookLevel[]): number | null {
  const b = bestBid(bids);
  const a = bestAsk(asks);
  if (b === null || a === null) return null;
  return round2((a + b) / 2);
}
