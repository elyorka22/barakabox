import type { ProductCardProps } from '@/components/product-card';
import type { StorefrontProduct } from '@/types/storefront-product';

export function mapStorefrontProductToCardProps(product: StorefrontProduct): ProductCardProps {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit ?? undefined,
    sellingMode: product.sellingMode ?? undefined,
    stepAmount: product.stepAmount,
    minimumAmount: product.minimumAmount,
    variants: product.variants?.map((variant) => ({
      ...variant,
      imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
    })),
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
  };
}
