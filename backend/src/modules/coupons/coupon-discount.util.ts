import type { CouponDiscountType } from '@prisma/client';

export type CouponLike = {
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
};

export function calculateCouponDiscount(
  coupon: CouponLike,
  subtotalAmount: number,
  grossTotal: number,
): number {
  const subtotal = Math.max(0, Math.floor(subtotalAmount));
  const gross = Math.max(0, Math.floor(grossTotal));
  if (subtotal < Math.max(0, coupon.minOrderAmount)) {
    return 0;
  }
  if (gross <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === 'PERCENT') {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    discount = Math.floor((gross * pct) / 100);
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Math.max(0, coupon.discountValue);
  }

  return Math.min(discount, gross);
}
