'use client';

import { memo, type ReactNode } from 'react';
import { useCartQuantity } from '@/lib/use-cart-store';

type Props = {
  variantId: string;
  children: ReactNode;
};

function ProductCardInCartRingBase({ variantId, children }: Props) {
  const quantity = useCartQuantity(variantId);
  const inCart = quantity > 0;

  return (
    <div
      className={`group flex h-full flex-col overflow-visible rounded-[20px] bg-white transition-shadow duration-200 ${
        inCart
          ? 'shadow-[0_2px_12px_rgba(34,197,94,0.14)]'
          : 'shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-[0_2px_10px_rgba(15,23,42,0.08)]'
      }`}
    >
      {children}
    </div>
  );
}

export const ProductCardInCartRing = memo(ProductCardInCartRingBase);
