import { calculateOrderTotals } from './order-totals.util';

describe('calculateOrderTotals', () => {
  it('computes final total with delivery, coupon, and cashback', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 21_000,
      deliveryFee: 3_000,
      couponDiscountTiyin: 2_000,
      cashbackBalance: 10_000,
      cashbackRedeemRequested: 500,
    });
    expect(r.grossTotal).toBe(24_000);
    expect(r.couponDiscountTiyin).toBe(2_000);
    expect(r.cashbackRedeemTiyin).toBe(500);
    expect(r.totalAmount).toBe(21_500);
  });

  it('caps cashback at amount after coupon', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 5_000,
      deliveryFee: 3_000,
      couponDiscountTiyin: 7_000,
      cashbackBalance: 50_000,
      cashbackRedeemRequested: 20_000,
    });
    expect(r.totalAmount).toBe(0);
    expect(r.cashbackRedeemTiyin).toBe(1_000);
  });
});
