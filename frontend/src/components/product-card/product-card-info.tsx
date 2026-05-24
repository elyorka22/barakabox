'use client';

import { memo } from 'react';
import { CashbackBadge } from '@/components/cashback-badge';
import { ProductCardPriceRow } from '@/components/product-card/product-card-price-row';

type Props = {
  name: string;
  metaLine: string;
  unitLine?: string;
  basePrice: number;
  salePrice: number | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
  layout?: 'default' | 'grid';
};

function ProductCardInfoBase({
  name,
  metaLine,
  unitLine,
  basePrice,
  salePrice,
  cashbackType,
  cashbackValue,
  layout = 'default',
}: Props) {
  if (layout === 'grid') {
    const unit = unitLine.trim();
    const detail = metaLine.trim();
    const showDetail = Boolean(detail) && detail !== unit;
    return (
      <div className="flex shrink-0 flex-col gap-0.5 px-0.5 pb-1 pt-1.5">
        <ProductCardPriceRow basePrice={basePrice} salePrice={salePrice} layout="grid" />
        <h3 className="line-clamp-2 text-[12px] font-normal leading-[1.25] text-[#111827]">{name}</h3>
        {unit ? (
          <p className="line-clamp-1 text-[11px] leading-tight text-[#9ca3af]">{unit}</p>
        ) : null}
        {showDetail ? (
          <p className="line-clamp-2 text-[11px] leading-tight text-[#9ca3af]">{detail}</p>
        ) : null}
      </div>
    );
  }

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
