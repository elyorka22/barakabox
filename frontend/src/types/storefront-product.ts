/** Product shape used on storefront grids and the product bottom sheet. */
export type StorefrontProduct = {
  id: string;
  name: string;
  price: string;
  unit?: string | null;
  unitType?: string | null;
  sellingMode?: string | null;
  stepAmount?: number | null;
  minimumAmount?: number | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imageThumbUrl?: string | null;
  discountEnabled?: boolean;
  discountedPrice?: number | null;
  promotionBadge?: 'HOT' | 'TOP' | 'YANGI' | 'AKSIYA' | 'PREMIUM' | null;
  promotionEnabled?: boolean;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  /** Base price before discount (tiyin) */
  oldPrice?: number | null;
  /** Best sale price (tiyin) */
  effectivePrice?: number | null;
  discountPercent?: number | null;
  isPromotion?: boolean;
  cashbackType?: 'NONE' | 'PERCENT' | 'FIXED_AMOUNT' | string | null;
  cashbackValue?: number | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};
