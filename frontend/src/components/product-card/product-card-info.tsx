'use client';

import { memo } from 'react';
import { CashbackBadge } from '@/components/cashback-badge';
import { ProductCardPriceRow } from '@/components/product-card/product-card-price-row';

type Props = {
  name: string;
  metaLine: string;
  basePrice: number;
  salePrice: number | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
};

function ProductCardInfoBase({
  name,
  metaLine,
  basePrice,
  salePrice,
  cashbackType,
  cashbackValue,
}: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 bg-white px-2 pb-2 pt-1">
      <ProductCardPriceRow basePrice={basePrice} salePrice={salePrice} />
      <h3 className="line-clamp-2 text-[11px] font-medium leading-[1.2] text-[#1f2937]">{name}</h3>
      {metaLine ? (
        <p className="line-clamp-1 text-[10px] leading-tight text-[#9ca3af]">{metaLine}</p>
      ) : null}
      <div className="min-h-0 empty:hidden">
        <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} variant="promo" />
      </div>
    </div>
  );
}

export const ProductCardInfo = memo(ProductCardInfoBase);
