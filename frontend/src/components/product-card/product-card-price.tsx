'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';
import { PRODUCT_UNIT_LABEL_UZ, type ProductUnitCode } from '@onlinebozor/product-units';

type Props = {
  basePrice: number;
  salePrice: number | null;
  unit: ProductUnitCode;
  compact?: boolean;
};

function ProductCardPriceBase({ basePrice, salePrice, unit, compact }: Props) {
  const unitSuffix = PRODUCT_UNIT_LABEL_UZ[unit];
  const priceClass = compact
    ? 'text-[15px] font-bold leading-tight tabular-nums text-[#111827]'
    : 'text-[16px] font-bold leading-tight tabular-nums text-[#111827]';
  const suffixClass = 'ml-0.5 text-[11px] font-medium text-[#6b7280]';

  if (salePrice !== null && salePrice < basePrice) {
    return (
      <div className="mt-1 min-h-[2.5rem]">
        <p className="text-[11px] font-medium leading-none text-[#9ca3af] line-through">
          {formatMoneyUz(basePrice)}
        </p>
        <p className={`mt-0.5 ${priceClass}`}>
          {formatMoneyUz(salePrice)}
          <span className={suffixClass}>/ {unitSuffix}</span>
        </p>
      </div>
    );
  }

  return (
    <p className={`mt-1 min-h-[2.5rem] ${priceClass}`}>
      {formatMoneyUz(basePrice)}
      <span className={suffixClass}>/ {unitSuffix}</span>
    </p>
  );
}

export const ProductCardPrice = memo(ProductCardPriceBase);
