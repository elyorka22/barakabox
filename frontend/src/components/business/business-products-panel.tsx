'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import {
  DEFAULT_PRODUCT_UNIT,
  formatQuantityWithUnit,
  normalizedProductSaleUnit,
} from '@onlinebozor/product-units';

type Product = {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  unit?: string | null;
  isActive: boolean;
};

type Props = {
  onRefresh?: () => void;
};

export function BusinessProductsPanel({ onRefresh }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get<Product[]>('/products/me', token);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (product: Product) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await api.patch(`/products/${product.id}`, { isActive: !product.isActive }, token);
    await load();
    onRefresh?.();
  };

  const adjustStock = async (product: Product, delta: number) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const next = Math.max(0, product.stockQuantity + delta);
    await api.patch(`/products/${product.id}`, { stockQuantity: next }, token);
    await load();
    onRefresh?.();
  };

  return (
    <div className="space-y-3 p-4 pb-24">
      <button
        type="button"
        onClick={() => void load()}
        className="text-sm font-semibold text-emerald-700"
      >
        Yangilash
      </button>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-500">Mahsulot yoʻq</p>
      ) : (
        products.map((p) => (
          <article
            key={p.id}
            className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${p.isActive ? 'ring-black/[0.04]' : 'ring-rose-200 opacity-70'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm tabular-nums text-slate-600">{formatMoneyUz(p.price)}</p>
                <p className="text-xs text-slate-500">
                  Qoldiq:{' '}
                  {formatQuantityWithUnit(
                    p.stockQuantity,
                    normalizedProductSaleUnit(p) ?? DEFAULT_PRODUCT_UNIT,
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleActive(p)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium"
              >
                {p.isActive ? 'Faol' : 'Oʻchiq'}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold"
                onClick={() => void adjustStock(p, -1)}
              >
                −
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white"
                onClick={() => void adjustStock(p, 1)}
              >
                +
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
