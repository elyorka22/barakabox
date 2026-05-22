import type { StorefrontProductRow } from './storefront-product.mapper';

export type PromotionSort = 'newest' | 'discount_desc';

export function isPromotionWindowActive(
  promotionEnabled: boolean,
  promotionStartAt: Date | null,
  promotionEndAt: Date | null,
  now = new Date(),
): boolean {
  if (!promotionEnabled) return false;
  if (promotionStartAt && promotionStartAt > now) return false;
  if (promotionEndAt && promotionEndAt < now) return false;
  return true;
}

export function productHasStorefrontDiscount(row: StorefrontProductRow, now = new Date()): boolean {
  if (isPromotionWindowActive(row.promotionEnabled, row.promotionStartAt, row.promotionEndAt, now)) {
    return true;
  }
  if (
    row.discountEnabled &&
    row.discountedPrice != null &&
    row.discountedPrice > 0 &&
    row.discountedPrice < row.price
  ) {
    return true;
  }
  return row.variants.some(
    (v) =>
      typeof v.discountPrice === 'number' &&
      v.discountPrice > 0 &&
      v.discountPrice < v.price,
  );
}

export function promotionDiscountPercent(basePrice: number, salePrice: number): number {
  if (basePrice <= 0 || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

export function resolvePromotionPricing(row: StorefrontProductRow, now = new Date()) {
  let basePrice = row.price;
  let salePrice: number | null = null;

  if (
    row.discountEnabled &&
    row.discountedPrice != null &&
    row.discountedPrice > 0 &&
    row.discountedPrice < row.price
  ) {
    salePrice = row.discountedPrice;
  }

  for (const variant of row.variants) {
    const variantBase = variant.price;
    if (variantBase > basePrice) basePrice = variantBase;
    if (
      typeof variant.discountPrice === 'number' &&
      variant.discountPrice > 0 &&
      variant.discountPrice < variantBase
    ) {
      if (salePrice === null || variant.discountPrice < salePrice) {
        salePrice = variant.discountPrice;
        basePrice = variantBase;
      }
    }
  }

  const promoActive = isPromotionWindowActive(
    row.promotionEnabled,
    row.promotionStartAt,
    row.promotionEndAt,
    now,
  );

  return {
    oldPrice: basePrice,
    effectivePrice: salePrice ?? basePrice,
    discountPercent:
      salePrice !== null ? promotionDiscountPercent(basePrice, salePrice) : promoActive ? 0 : 0,
    isPromotion: promoActive || (salePrice !== null && salePrice < basePrice),
  };
}

export function sortPromotionRows(rows: StorefrontProductRow[], sort: PromotionSort): StorefrontProductRow[] {
  const now = new Date();
  if (sort === 'newest') {
    return [...rows];
  }
  return [...rows].sort((a, b) => {
    const pa = resolvePromotionPricing(a, now);
    const pb = resolvePromotionPricing(b, now);
    const da = pa.discountPercent;
    const db = pb.discountPercent;
    if (db !== da) return db - da;
    return b.price - a.price;
  });
}
