'use client';

import { memo } from 'react';
import { formatMoneyUz } from '@/lib/format';

type Props = {
  quantityLabel: string;
  lineTotal: number;
  visible: boolean;
};

function ProductCardCartSummaryBase({ quantityLabel, lineTotal, visible }: Props) {
  return (
    <div
      className={`mt-2 overflow-hidden transition-all duration-300 ease-out ${
        visible ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="rounded-2xl bg-[#ecfdf3] px-3 py-2.5 ring-1 ring-[#bbf7d0]/80">
        <p
          key={quantityLabel}
          className="product-card-qty-label text-[12px] font-semibold leading-tight text-[#166534]"
        >
          {quantityLabel}
        </p>
        <p className="mt-0.5 text-[17px] font-extrabold leading-none tabular-nums tracking-tight text-[#14532d]">
          {formatMoneyUz(lineTotal)}
        </p>
      </div>
    </div>
  );
}

export const ProductCardCartSummary = memo(ProductCardCartSummaryBase);
