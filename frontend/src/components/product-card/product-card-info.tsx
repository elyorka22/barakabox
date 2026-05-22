'use client';

import { memo } from 'react';
import { ProductCardPriceRow } from '@/components/product-card/product-card-price-row';

type Props = {
  name: string;
  metaLine: string;
  basePrice: number;
  salePrice: number | null;
};

function ProductCardInfoBase({ name, metaLine, basePrice, salePrice }: Props) {
  return (
    <div className="flex h-[52px] shrink-0 flex-col justify-start gap-px px-2 pb-1.5 pt-1">
      <div className="h-[30px] shrink-0 overflow-hidden">
        <ProductCardPriceRow basePrice={basePrice} salePrice={salePrice} />
      </div>
      <h3 className="line-clamp-2 h-[26px] shrink-0 text-[11px] font-medium leading-[13px] text-[#374151]">
        {name}
      </h3>
      <p className="h-3 shrink-0 truncate text-[10px] leading-3 text-[#9ca3af]">{metaLine || '\u00A0'}</p>
    </div>
  );
}

export const ProductCardInfo = memo(ProductCardInfoBase);
