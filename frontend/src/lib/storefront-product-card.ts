import type { ProductCardProps } from '@/components/product-card';
import { resolveProductImageUrl } from '@/lib/product-image';
import type { StorefrontProduct } from '@/types/storefront-product';

function cardVariants(product: StorefrontProduct): NonNullable<ProductCardProps['variants']> {
  if (product.variants && product.variants.length > 0) {
    return product.variants.map((variant) => ({
      ...variant,
      imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
    }));
  }

  const imageUrl = resolveProductImageUrl(product) || product.imageCardUrl || product.imageUrl;
  return [
    {
      id: product.listingId ?? product.id,
      flavor: product.brand ?? null,
      price: product.price,
      discountPrice:
        product.discountEnabled && product.discountedPrice != null
          ? product.discountedPrice
          : null,
      stock: product.stock ?? 0,
      imageUrl,
    },
  ];
}

export function mapStorefrontProductToCardProps(
  product: StorefrontProduct,
  opts?: { grid?: boolean },
): ProductCardProps {
  return {
    id: product.id,
    listingId: product.listingId,
    storeId: product.storeId,
    storeName: product.storeName,
    storeSlug: product.storeSlug,
    purchasable: product.purchasable,
    name: product.name,
    subtitle: product.description ?? undefined,
    price: product.price,
    unit: product.unit ?? undefined,
    sellingMode: product.sellingMode ?? undefined,
    stepAmount: product.stepAmount,
    minimumAmount: product.minimumAmount,
    variants: cardVariants(product),
    imageUrl: product.imageCardUrl ?? product.imageUrl,
    imageCardUrl: product.imageCardUrl,
    imageThumbUrl: product.imageThumbUrl,
    cashbackType: product.cashbackType ?? undefined,
    cashbackValue: product.cashbackValue ?? undefined,
    discountEnabled: product.discountEnabled,
    discountedPrice: product.discountedPrice,
    promotionBadge: product.promotionBadge,
    promotionEnabled: product.promotionEnabled,
    promotionStartAt: product.promotionStartAt,
    promotionEndAt: product.promotionEndAt,
    topBadge: product.topBadge,
    cardVariant: opts?.grid ? 'grid' : product.isTopProduct ? 'top' : 'default',
  };
}
