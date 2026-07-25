import {
  SECONDARY_ADMIN_FEE_PCT,
  adminFee,
  bestAsk,
  bestBid,
  buyerCost,
  midPrice,
  sellerProceeds,
  spread,
} from '../secondary';

describe('secondary-market economics', () => {
  it('computes the 1.5% admin fee, rounded to cents', () => {
    expect(SECONDARY_ADMIN_FEE_PCT).toBe(1.5);
    expect(adminFee(1350)).toBe(20.25);
    expect(adminFee(0)).toBe(0);
    expect(adminFee(-100)).toBe(0);
  });

  it('computes buyer cost = subtotal + fee', () => {
    const c = buyerCost(100, 13.5);
    expect(c.subtotal).toBe(1350);
    expect(c.fee).toBe(20.25);
    expect(c.total).toBe(1370.25);
  });

  it('gives the seller the trade value with no fee deducted', () => {
    expect(sellerProceeds(100, 13.5)).toBe(1350);
  });

  const bids = [
    { price: 12.75, units: 150 },
    { price: 13.0, units: 80 },
  ];
  const asks = [
    { price: 13.5, units: 100 },
    { price: 14.0, units: 50 },
  ];

  it('finds best bid / ask, spread, and mid', () => {
    expect(bestBid(bids)).toBe(13.0);
    expect(bestAsk(asks)).toBe(13.5);
    expect(spread(bids, asks)).toBe(0.5);
    expect(midPrice(bids, asks)).toBe(13.25);
  });

  it('returns null on an empty side', () => {
    expect(bestBid([])).toBeNull();
    expect(spread([], asks)).toBeNull();
    expect(midPrice(bids, [])).toBeNull();
  });
});
