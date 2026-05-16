/** Mirrors backend `calculateOrderTotals` (amounts in so'm, integers). */

export type OrderTotalsInput = {
  subtotalAmount: number;
  deliveryFee: number;
  cashbackBalance?: number;
  cashbackRedeemRequested?: number;
  couponDiscountTiyin?: number;
};

export type OrderTotalsResult = {
  subtotalAmount: number;
  deliveryFee: number;
  grossTotal: number;
  couponDiscountTiyin: number;
  cashbackRedeemTiyin: number;
  totalAmount: number;
};

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotalsResult {
  const subtotalAmount = Math.max(0, Math.floor(Number(input.subtotalAmount) || 0));
  const deliveryFee = Math.max(0, Math.floor(Number(input.deliveryFee) || 0));
  const balance = Math.max(0, Math.floor(Number(input.cashbackBalance) || 0));
  const requested = Math.max(0, Math.floor(Number(input.cashbackRedeemRequested) || 0));
  const couponDiscountTiyin = Math.max(0, Math.floor(Number(input.couponDiscountTiyin) || 0));
  const grossTotal = subtotalAmount + deliveryFee;
  const afterCoupon = Math.max(0, grossTotal - Math.min(couponDiscountTiyin, grossTotal));
  const maxRedeem = Math.min(balance, afterCoupon);
  const cashbackRedeemTiyin = Math.min(requested, maxRedeem);
  const totalAmount = Math.max(0, afterCoupon - cashbackRedeemTiyin);

  return {
    subtotalAmount,
    deliveryFee,
    grossTotal,
    couponDiscountTiyin: Math.min(couponDiscountTiyin, grossTotal),
    cashbackRedeemTiyin,
    totalAmount,
  };
}

export function parseCashbackRedeemInput(raw: string): number {
  const digits = raw.replace(/\s/g, '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
