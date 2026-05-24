'use client';

import { memo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  variant?: 'default' | 'grid';
};

/** One continuous grocery card surface — no split blocks or layout jump. */
function ProductCardInCartRingBase({ children, variant = 'default' }: Props) {
  if (variant === 'grid') {
    return <div className="flex h-full flex-col">{children}</div>;
  }
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-shadow duration-150 hover:shadow-[0_3px_14px_rgba(15,23,42,0.08)]">
      {children}
    </div>
  );
}

export const ProductCardInCartRing = memo(ProductCardInCartRingBase);
