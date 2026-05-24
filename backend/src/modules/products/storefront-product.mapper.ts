import { Prisma } from '@prisma/client';
import {
  productHasStorefrontDiscount,
  resolvePromotionPricing,
} from './promotion-product.util';

/** Lean select for storefront lists — avoids business join payload. */
export const storefrontProductSelect = {
  id: true,
  name: true,
  price: true,
  unit: true,
  sellingMode: true,
  stepAmount: true,
  minimumAmount: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, slug: true, sortOrder: true },
  },
  imageUrl: true,
  imageCardUrl: true,
  imageThumbUrl: true,
  discountEnabled: true,
  discountedPrice: true,
  promotionBadge: true,
  promotionEnabled: true,
  promotionStartAt: true,
  promotionEndAt: true,
  cashbackType: true,
  cashbackValue: true,
  isTopProduct: true,
  topOrder: true,
  topBadge: true,
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      title: true,
      flavor: true,
      description: true,
      price: true,
      discountPrice: true,
      stock: true,
      imageUrl: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type StorefrontProductRow = Prisma.ProductGetPayload<{
  select: typeof storefrontProductSelect;
}>;

export function mapStorefrontProduct(row: StorefrontProductRow, opts?: { withPromotionMeta?: boolean }) {
  const pricing =
    opts?.withPromotionMeta && productHasStorefrontDiscount(row)
      ? resolvePromotionPricing(row)
      : null;

  return {
    id: row.id,
    name: row.name,
    price: String(row.price),
    unit: row.unit,
    unitType: row.unit,
    sellingMode: row.sellingMode,
    stepAmount: row.stepAmount,
    minimumAmount: row.minimumAmount,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    categorySortOrder: row.category?.sortOrder ?? 99999,
    imageUrl: row.imageUrl,
    imageCardUrl: row.imageCardUrl,
    imageThumbUrl: row.imageThumbUrl,
    discountEnabled: row.discountEnabled,
    discountedPrice: row.discountedPrice,
    promotionBadge: row.promotionBadge,
    promotionEnabled: row.promotionEnabled,
    promotionStartAt: row.promotionStartAt,
    promotionEndAt: row.promotionEndAt,
    cashbackType: row.cashbackType,
    cashbackValue: row.cashbackValue,
    isTopProduct: row.isTopProduct,
    topOrder: row.topOrder,
    topBadge: row.topBadge,
    variants: row.variants,
    ...(pricing
      ? {
          oldPrice: pricing.oldPrice,
          effectivePrice: pricing.effectivePrice,
          discountPercent: pricing.discountPercent,
          isPromotion: pricing.isPromotion,
        }
      : {}),
  };
}
