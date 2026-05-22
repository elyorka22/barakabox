'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';

type Props = {
  basePrice: number;
  salePrice: number | null;
};

function ProductCardPriceRowBase({ basePrice, salePrice }: Props) {
  const hasDiscount = salePrice !== null && salePrice < basePrice;
  const displayPrice = hasDiscount ? salePrice : basePrice;

  if (hasDiscount) {
    return (
      <div>
        <p className="text-[9px] font-medium leading-none text-[#9ca3af] line-through tabular-nums">
          {formatMoneyUz(basePrice)}
        </p>
        <p className="truncate text-[14px] font-bold leading-tight tabular-nums text-[#0f172a]">
          {formatMoneyUz(displayPrice)}
        </p>
      </div>
    );
  }

  return (
    <p className="truncate text-[14px] font-bold leading-tight tabular-nums text-[#0f172a]">
      {formatMoneyUz(displayPrice)}
    </p>
  );
}

export const ProductCardPriceRow = memo(ProductCardPriceRowBase);
