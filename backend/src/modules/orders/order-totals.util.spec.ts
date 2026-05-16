import { calculateOrderTotals } from './order-totals.util';

describe('calculateOrderTotals', () => {
  it('computes final total with delivery and cashback', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 21_000,
      deliveryFee: 3_000,
      cashbackBalance: 10_000,
      cashbackRedeemRequested: 500,
    });
    expect(r.grossTotal).toBe(24_000);
    expect(r.cashbackRedeemTiyin).toBe(500);
    expect(r.totalAmount).toBe(23_500);
  });

  it('caps cashback at gross total', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 5_000,
      deliveryFee: 3_000,
      cashbackBalance: 50_000,
      cashbackRedeemRequested: 20_000,
    });
    expect(r.cashbackRedeemTiyin).toBe(8_000);
    expect(r.totalAmount).toBe(0);
  });

  it('caps cashback at available balance', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 20_000,
      deliveryFee: 0,
      cashbackBalance: 500,
      cashbackRedeemRequested: 2_000,
    });
    expect(r.cashbackRedeemTiyin).toBe(500);
    expect(r.totalAmount).toBe(19_500);
  });

  it('never returns negative totals', () => {
    const r = calculateOrderTotals({
      subtotalAmount: 0,
      deliveryFee: 0,
      cashbackRedeemRequested: 100,
    });
    expect(r.totalAmount).toBe(0);
    expect(r.cashbackRedeemTiyin).toBe(0);
  });
});
