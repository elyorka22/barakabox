'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

export function ProductRedirectClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { openProduct } = useProductSheet();

  useEffect(() => {
    const run = async () => {
      try {
        const list = await api.get<{ items: StorefrontProduct[] }>('/products?limit=48').then((r) => r.items ?? []);
        const product = list.find((p) => p.id === params.id);
        if (product) {
          openProduct(product);
        }
      } finally {
        router.replace('/');
      }
    };
    void run();
  }, [params.id, openProduct, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22c55e] border-t-transparent" />
    </div>
  );
}
