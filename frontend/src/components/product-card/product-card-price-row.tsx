'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';

type Props = {
  basePrice: number;
  salePrice: number | null;
};

/** Price-first row for compact marketplace cards (Lavka / Glovo style). */
function ProductCardPriceRowBase({ basePrice, salePrice }: Props) {
  const hasDiscount = salePrice !== null && salePrice < basePrice;
  const displayPrice = hasDiscount ? salePrice : basePrice;

  if (hasDiscount) {
    return (
      <div className="min-h-[1.125rem]">
        <p className="text-[10px] font-medium leading-none text-[#9ca3af] line-through tabular-nums">
          {formatMoneyUz(basePrice)}
        </p>
        <p className="mt-0.5 truncate text-[15px] font-bold leading-tight tabular-nums text-[#0f172a]">
          {formatMoneyUz(displayPrice)}
        </p>
      </div>
    );
  }

  return (
    <p className="min-h-[1.125rem] truncate text-[15px] font-bold leading-tight tabular-nums text-[#0f172a]">
      {formatMoneyUz(displayPrice)}
    </p>
  );
}

export const ProductCardPriceRow = memo(ProductCardPriceRowBase);
