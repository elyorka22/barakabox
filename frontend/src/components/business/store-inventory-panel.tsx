'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import type { StoreListing } from '@/types/store-panel';

type InventoryResponse = {
  lowStock: StoreListing[];
  outOfStock: StoreListing[];
  threshold: number;
};

function listingLabel(row: StoreListing) {
  const v = row.globalVariant?.value;
  return v ? `${row.globalProduct.name} (${v})` : row.globalProduct.name;
}

export function StoreInventoryPanel() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<InventoryResponse>('/businesses/panel/inventory', token);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const adjustStock = async (row: StoreListing, delta: number) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setBusyId(row.id);
    try {
      await api.patch(
        `/businesses/catalog/listings/${row.id}`,
        { stock: Math.max(0, row.stock + delta) },
        token,
      );
      await load();
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white p-4" />;
  }

  if (!data) {
    return <p className="p-4 text-sm text-slate-500">Ombor maʼlumoti yoʻq</p>;
  }

  const renderList = (title: string, items: StoreListing[], tone: 'amber' | 'rose') => (
    <section
      className={`rounded-2xl p-3 ring-1 ${tone === 'amber' ? 'bg-amber-50 ring-amber-100' : 'bg-rose-50 ring-rose-100'}`}
    >
      <h3 className={`text-sm font-semibold ${tone === 'amber' ? 'text-amber-900' : 'text-rose-900'}`}>
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-slate-500">Hozircha yoʻq</li>
        ) : (
          items.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-2 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{listingLabel(row)}</p>
                <p className="text-xs text-slate-500">
                  {formatMoneyUz(row.price)} · {row.stock} dona
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-lg leading-none"
                  onClick={() => void adjustStock(row, -1)}
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-lg leading-none"
                  onClick={() => void adjustStock(row, 1)}
                >
                  +
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );

  return (
    <div className="space-y-3 p-4 pb-24">
      <p className="text-xs text-slate-500">
        Kam qolgan: ≤{data.threshold} dona. Barcha listinglar marketplace omboridan boshqariladi.
      </p>
      {renderList('Kam qolgan', data.lowStock, 'amber')}
      {renderList('Tugagan', data.outOfStock, 'rose')}
    </div>
  );
}
