'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';
import { PRODUCT_UNIT_LABEL_UZ, type ProductUnitCode } from '@onlinebozor/product-units';

type Props = {
  inCart: boolean;
  quantityLabel: string;
  lineTotal: number;
  basePrice: number;
  salePrice: number | null;
  unit: ProductUnitCode;
};

function ProductCardFooterBase({
  inCart,
  quantityLabel,
  lineTotal,
  basePrice,
  salePrice,
  unit,
}: Props) {
  if (inCart) {
    return (
      <div className="mt-1 min-h-[1.5rem]">
        <p
          key={quantityLabel}
          className="product-card-qty-label truncate text-[11px] font-semibold leading-tight text-[#22c55e]"
        >
          {quantityLabel}
        </p>
        <p className="mt-px truncate text-[14px] font-bold leading-none tabular-nums text-[#111827]">
          {formatMoneyUz(lineTotal)}
        </p>
      </div>
    );
  }

  const unitSuffix = PRODUCT_UNIT_LABEL_UZ[unit];
  const hasDiscount = salePrice !== null && salePrice < basePrice;

  if (hasDiscount) {
    return (
      <div className="mt-0.5 min-h-[1.5rem]">
        <p className="text-[10px] font-medium leading-none text-[#9ca3af] line-through">
          {formatMoneyUz(basePrice)}
        </p>
        <p className="mt-px truncate text-[14px] font-bold leading-none tabular-nums text-[#111827]">
          {formatMoneyUz(salePrice)}
          <span className="ml-0.5 text-[10px] font-medium text-[#9ca3af]">/ {unitSuffix}</span>
        </p>
      </div>
    );
  }

  return (
    <p className="mt-0.5 min-h-[1.5rem] truncate text-[14px] font-bold leading-tight tabular-nums text-[#111827]">
      {formatMoneyUz(basePrice)}
      <span className="ml-0.5 text-[10px] font-medium text-[#9ca3af]">/ {unitSuffix}</span>
    </p>
  );
}

export const ProductCardFooter = memo(ProductCardFooterBase);
