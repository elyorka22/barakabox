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
