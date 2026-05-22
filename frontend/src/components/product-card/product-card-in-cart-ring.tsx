'use client';

import { memo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Stable card chrome — same shadow in/out of cart so the grid does not jump. */
function ProductCardInCartRingBase({ children }: Props) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.07)] transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(15,23,42,0.09)]">
      {children}
    </div>
  );
}

export const ProductCardInCartRing = memo(ProductCardInCartRingBase);
