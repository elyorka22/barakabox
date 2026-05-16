import { normalizeAssetUrl } from '@/lib/asset-url';

export type ProductImageSource = {
  imageThumbUrl?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  variants?: Array<{ imageUrl?: string | null }> | null;
};

/** Resolve best display URL: product assets first, then first variant image. */
export function resolveProductImageUrl(product: ProductImageSource): string {
  const candidates = [
    product.imageThumbUrl,
    product.imageCardUrl,
    product.imageUrl,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (trimmed) return normalizeAssetUrl(trimmed);
  }
  for (const variant of product.variants ?? []) {
    const trimmed = variant.imageUrl?.trim();
    if (trimmed) return normalizeAssetUrl(trimmed);
  }
  return '';
}
