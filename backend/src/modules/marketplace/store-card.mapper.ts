import { Prisma } from '@prisma/client';

export const VISIBLE_STORE_LISTING_WHERE: Prisma.StoreProductWhereInput = {
  isVisible: true,
  stock: { gt: 0 },
  store: { isActive: true },
  globalProduct: { isActive: true },
};

export const storeCardSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bannerUrl: true,
  description: true,
  address: true,
  phone: true,
  deliveryTimeMinutes: true,
  rating: true,
  deliveryPrice: true,
  minOrderPrice: true,
  isActive: true,
  isFeatured: true,
  sortOrder: true,
  createdAt: true,
  _count: {
    select: {
      storeProducts: { where: VISIBLE_STORE_LISTING_WHERE },
    },
  },
} satisfies Prisma.StoreSelect;

export type StoreCardRow = Prisma.StoreGetPayload<{ select: typeof storeCardSelect }>;

/** Public store card (logo/banner aliases for API consumers). */
export function mapStoreCard(row: StoreCardRow) {
  const productCount = row._count?.storeProducts ?? 0;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logoUrl,
    banner: row.bannerUrl,
    logoUrl: row.logoUrl,
    bannerUrl: row.bannerUrl,
    description: row.description,
    address: row.address,
    phone: row.phone,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    deliveryTime: row.deliveryTimeMinutes,
    deliveryTimeMinutes: row.deliveryTimeMinutes,
    rating: row.rating != null ? Number(row.rating) : 0,
    productCount,
    deliveryPrice: row.deliveryPrice,
    minOrderPrice: row.minOrderPrice,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}
