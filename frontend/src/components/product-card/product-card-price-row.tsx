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
      <div className="leading-none">
        <p className="text-[10px] font-medium text-[#9ca3af] line-through tabular-nums">
          {formatMoneyUz(basePrice)}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-bold tabular-nums text-[#111827]">
          {formatMoneyUz(displayPrice)}
        </p>
      </div>
    );
  }

  return (
    <p className="truncate text-[13px] font-bold leading-tight tabular-nums text-[#111827]">
      {formatMoneyUz(displayPrice)}
    </p>
  );
}

export const ProductCardPriceRow = memo(ProductCardPriceRowBase);
