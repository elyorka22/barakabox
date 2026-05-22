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
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[box-shadow,ring] duration-200 ${
        inCart ? 'ring-2 ring-[#22c55e]/30' : ''
      }`}
    >
      {children}
    </div>
  );
}

export const ProductCardInCartRing = memo(ProductCardInCartRingBase);
