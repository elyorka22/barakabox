import { api } from '@/lib/api';
import type { StorefrontProduct } from '@/types/storefront-product';

export async function fetchListingStorefrontProduct(listingId: string): Promise<StorefrontProduct> {
  return api.get<StorefrontProduct>(`/marketplace/listings/${encodeURIComponent(listingId)}/product`);
}

export async function hydrateStorefrontProduct(
  product: StorefrontProduct,
): Promise<StorefrontProduct> {
  if (!product.listingId) return product;
  if (product.variants && product.variants.length > 0 && product.purchasable !== false) {
    return product;
  }
  try {
    return await fetchListingStorefrontProduct(product.listingId);
  } catch {
    return product;
  }
}
