'use client';

import { memo } from 'react';
import { SafeImage } from '@/components/safe-image';
import { resolveProductImageUrl } from '@/lib/product-image';
import type { AdminInventoryProduct } from './product-inventory-utils';

type Props = {
  product: AdminInventoryProduct;
};

function AdminProductThumbnailInner({ product }: Props) {
  const src = resolveProductImageUrl(product);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
      {src ? (
        <SafeImage
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-0.5"
          fallbackClassName="flex h-full w-full items-center justify-center bg-slate-50 text-[10px] text-slate-400"
        />
      ) : (
        <span className="text-[10px] text-slate-400">—</span>
      )}
    </div>
  );
}

export const AdminProductThumbnail = memo(AdminProductThumbnailInner);
