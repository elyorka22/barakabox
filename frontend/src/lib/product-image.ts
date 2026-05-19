import { normalizeAssetUrl } from '@/lib/asset-url';

export type ProductImageFields = {
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imageThumbUrl?: string | null;
};

export type VariantImageFields = {
  imageUrl?: string | null;
};

/** Resolve best display URL: variant → card → main → thumb. */
export function resolveVariantImageUrl(
  variant: VariantImageFields | null | undefined,
  product: ProductImageFields | null | undefined,
): string {
  const candidates = [
    variant?.imageUrl,
    product?.imageCardUrl,
    product?.imageUrl,
    product?.imageThumbUrl,
  ];
  for (const raw of candidates) {
    const url = normalizeAssetUrl(raw);
    if (url) return url;
  }
  return '';
}

export function resolveProductImageUrl(product: ProductImageFields | null | undefined): string {
  return resolveVariantImageUrl(null, product);
}

/** Unified white product image surface (cards, sheet, cart). */
export const PRODUCT_IMAGE_SURFACE_CLASS = 'bg-white';

export const PRODUCT_IMAGE_FALLBACK_CLASS =
  'flex h-full w-full items-center justify-center bg-white text-slate-300';
