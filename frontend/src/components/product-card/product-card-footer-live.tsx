'use client';

import { memo, useMemo } from 'react';
import {
  calculateSellingModeLineTotal,
  formatSellingModeQuantity,
  type ProductUnitCode,
  type SellingMode,
} from '@onlinebozor/product-units';
import { useCartQuantity } from '@/lib/use-cart-store';
import { ProductCardFooter } from '@/components/product-card/product-card-footer';

type Props = {
  variantId: string;
  unitPrice: number;
  basePrice: number;
  salePrice: number | null;
  unit: ProductUnitCode;
  sellingMode: SellingMode;
};

function ProductCardFooterLiveBase({
  variantId,
  unitPrice,
  basePrice,
  salePrice,
  unit,
  sellingMode,
}: Props) {
  const quantity = useCartQuantity(variantId);
  const inCart = quantity > 0;

  const quantityLabel = formatSellingModeQuantity(quantity, sellingMode, unit);
  const lineTotal = useMemo(
    () => calculateSellingModeLineTotal(unitPrice, quantity, sellingMode),
    [unitPrice, quantity, sellingMode],
  );

  return (
    <ProductCardFooter
      inCart={inCart}
      quantityLabel={quantityLabel}
      lineTotal={lineTotal}
      basePrice={basePrice}
      salePrice={salePrice}
      unit={unit}
    />
  );
}

export const ProductCardFooterLive = memo(ProductCardFooterLiveBase);
