'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';

type Props = {
  basePrice: number;
  salePrice: number | null;
  layout?: 'default' | 'grid';
};

function ProductCardPriceRowBase({ basePrice, salePrice, layout = 'default' }: Props) {
  const hasDiscount = salePrice !== null && salePrice < basePrice;
  const displayPrice = hasDiscount ? salePrice : basePrice;
  const isGrid = layout === 'grid';

  if (hasDiscount) {
    if (isGrid) {
      return (
        <div className="leading-tight">
          <p className="truncate text-[15px] font-bold tabular-nums text-[#e11d48]">
            {formatMoneyUz(displayPrice)}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#9ca3af] line-through tabular-nums">
            {formatMoneyUz(basePrice)}
          </p>
        </div>
      );
    }
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
    <p
      className={`truncate font-bold leading-tight tabular-nums text-[#111827] ${
        isGrid ? 'text-[15px]' : 'text-[13px]'
      }`}
    >
      {formatMoneyUz(displayPrice)}
    </p>
  );
}

export const ProductCardPriceRow = memo(ProductCardPriceRowBase);
