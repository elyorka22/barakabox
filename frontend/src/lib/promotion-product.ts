import type { StorefrontProduct } from '@/types/storefront-product';

export function resolveProductSalePricing(product: StorefrontProduct) {
  if (product.effectivePrice != null && product.oldPrice != null && product.effectivePrice < product.oldPrice) {
    return {
      basePrice: product.oldPrice,
      salePrice: product.effectivePrice,
      discountPercent: product.discountPercent ?? 0,
    };
  }

  const variant = product.variants?.[0];
  const basePrice = Number(variant?.price ?? product.price);
  let salePrice: number | null = null;

  if (
    product.discountEnabled &&
    product.discountedPrice != null &&
    product.discountedPrice > 0 &&
    product.discountedPrice < basePrice
  ) {
    salePrice = product.discountedPrice;
  }

  if (
    variant?.discountPrice != null &&
    variant.discountPrice > 0 &&
    variant.discountPrice < basePrice
  ) {
    salePrice = variant.discountPrice;
  }

  const discountPercent =
    salePrice !== null && basePrice > 0
      ? Math.round(((basePrice - salePrice) / basePrice) * 100)
      : 0;

  return { basePrice, salePrice, discountPercent };
}

export function hasVisibleDiscount(product: StorefrontProduct): boolean {
  const { salePrice, basePrice, discountPercent } = resolveProductSalePricing(product);
  return (
    Boolean(product.isPromotion || product.promotionEnabled) ||
    (salePrice !== null && salePrice < basePrice) ||
    discountPercent > 0
  );
}
