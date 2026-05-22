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
    <div className="flex flex-[2] flex-col justify-start gap-0.5 px-2.5 pb-2 pt-1.5">
      <ProductCardPriceRow basePrice={basePrice} salePrice={salePrice} />
      <h3 className="line-clamp-2 text-[11px] font-medium leading-[1.25] text-[#374151]">{name}</h3>
      {metaLine ? (
        <p className="line-clamp-1 text-[10px] leading-tight text-[#9ca3af]">{metaLine}</p>
      ) : null}
      <div className="min-h-[14px] pt-px">
        <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} variant="promo" />
      </div>
    </div>
  );
}

export const ProductCardInfo = memo(ProductCardInfoBase);
