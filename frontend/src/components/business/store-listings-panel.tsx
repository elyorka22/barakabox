'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import type { StoreListing } from '@/types/store-panel';

function listingLabel(row: StoreListing) {
  const v = row.globalVariant?.value;
  return v ? `${row.globalProduct.name} (${v})` : row.globalProduct.name;
}

export function StoreListingsPanel() {
  const [rows, setRows] = useState<StoreListing[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (filter !== 'all') params.set('visible', filter);
      const res = await api.get<StoreListing[]>(`/businesses/panel/listings?${params}`, token);
      setRows(res);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchListing = async (id: string, body: Record<string, unknown>) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setBusyId(id);
    try {
      await api.patch(`/businesses/catalog/listings/${id}`, body, token);
      await load();
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold text-[#111827]">Mening listinglarim</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
          placeholder="Qidiruv…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load();
          }}
        />
        <select
          className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'visible' | 'hidden')}
        >
          <option value="all">Barchasi</option>
          <option value="visible">Vitrinada</option>
          <option value="hidden">Yashirin</option>
        </select>
      </div>
      {loading ? (
        <div className="h-12 animate-pulse rounded-xl bg-white" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Listing yoʻq — katalogdan qoʻshing</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{listingLabel(row)}</p>
                  <p className="text-xs text-slate-500">
                    {formatMoneyUz(row.price)}
                    {row.oldPrice ? ` · eski ${formatMoneyUz(row.oldPrice)}` : ''}
                    {' · '}
                    {row.stock} dona
                    {row.isTop ? ' · TOP' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="shrink-0 text-xs font-medium text-emerald-700"
                  onClick={() => void patchListing(row.id, { isVisible: !row.isVisible })}
                >
                  {row.isVisible ? 'Yashirish' : 'Ko‘rsatish'}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  onClick={() => void patchListing(row.id, { stock: Math.max(0, row.stock - 1) })}
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  onClick={() => void patchListing(row.id, { stock: row.stock + 1 })}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
