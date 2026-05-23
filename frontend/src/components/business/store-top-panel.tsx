'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import type { StoreListing } from '@/types/store-panel';

function listingLabel(row: StoreListing) {
  const v = row.globalVariant?.value;
  return v ? `${row.globalProduct.name} (${v})` : row.globalProduct.name;
}

export function StoreTopPanel() {
  const [rows, setRows] = useState<StoreListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<StoreListing[]>('/businesses/panel/top', token);
      setRows(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleTop = (id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextTop = !r.isTop;
        const topOrder = nextTop
          ? Math.max(0, ...prev.filter((x) => x.isTop).map((x) => x.topOrder)) + 1
          : 0;
        return { ...r, isTop: nextTop, topOrder };
      }),
    );
  };

  const save = async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const items = rows.map((r) => ({ id: r.id, isTop: r.isTop, topOrder: r.topOrder }));
      const updated = await api.patch<StoreListing[]>('/businesses/panel/top', { items }, token);
      setRows(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white m-4" />;
  }

  const topRows = rows.filter((r) => r.isTop);

  return (
    <div className="space-y-3 p-4 pb-24">
      <p className="text-xs text-slate-500">
        Top mahsulotlar do‘kon vitrinasida ustun ko‘rinadi (marketplace listinglar).
      </p>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      <p className="text-sm font-medium text-slate-700">Tanlangan: {topRows.length}</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]"
          >
            <input
              type="checkbox"
              checked={row.isTop}
              onChange={() => toggleTop(row.id)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{listingLabel(row)}</p>
              <p className="text-xs text-slate-500">{formatMoneyUz(row.price)}</p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={saving}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => void save()}
      >
        Saqlash
      </button>
    </div>
  );
}
