import { Prisma } from '@prisma/client';

export const storefrontListingSelect = {
  id: true,
  price: true,
  oldPrice: true,
  stock: true,
  isTop: true,
  topOrder: true,
  legacyProductId: true,
  globalProduct: {
    select: {
      id: true,
      name: true,
      brand: true,
      imageUrl: true,
      imageCardUrl: true,
      imageThumbUrl: true,
      categoryId: true,
    },
  },
  globalVariant: {
    select: { id: true, value: true, imageUrl: true },
  },
  store: {
    select: { id: true, name: true, slug: true },
  },
} satisfies Prisma.StoreProductSelect;

export type StorefrontListingRow = Prisma.StoreProductGetPayload<{
  select: typeof storefrontListingSelect;
}>;

/** Maps marketplace listing to storefront product card (uses legacy id for cart when migrated). */
export function mapListingToStorefront(row: StorefrontListingRow) {
  const variantLabel = row.globalVariant?.value;
  const name = variantLabel
    ? `${row.globalProduct.name} ${variantLabel}`
    : row.globalProduct.name;

  const price = row.price;
  const oldPrice = row.oldPrice;
  const hasDiscount = oldPrice !== null && oldPrice > price;

  return {
    id: row.legacyProductId ?? row.id,
    listingId: row.id,
    storeId: row.store.id,
    storeName: row.store.name,
    storeSlug: row.store.slug,
    purchasable: Boolean(row.legacyProductId),
    name,
    brand: row.globalProduct.brand,
    price: String(price),
    unit: 'dona' as const,
    unitType: 'dona' as const,
    categoryId: row.globalProduct.categoryId,
    imageUrl: row.globalVariant?.imageUrl ?? row.globalProduct.imageUrl,
    imageCardUrl: row.globalProduct.imageCardUrl,
    imageThumbUrl: row.globalProduct.imageThumbUrl,
    discountEnabled: hasDiscount,
    discountedPrice: hasDiscount ? price : null,
    oldPrice: hasDiscount ? oldPrice : null,
    effectivePrice: price,
    discountPercent:
      hasDiscount && oldPrice
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : null,
    isTopProduct: row.isTop,
    topOrder: row.topOrder,
    stock: row.stock,
  };
}
