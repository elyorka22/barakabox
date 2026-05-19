'use client';

import type { ReactNode } from 'react';
import { ProductBottomSheet } from '@/components/product/product-bottom-sheet';
import { ProductSheetProvider } from '@/lib/product-sheet-context';

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <ProductSheetProvider>
      {children}
      <ProductBottomSheet />
    </ProductSheetProvider>
  );
}
