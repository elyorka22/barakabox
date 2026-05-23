'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Star, X } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { SafeImage } from '@/components/safe-image';

export const TOP_PRODUCT_BADGES = ['TOP', 'Trend', 'Mashhur', 'Tavsiya'] as const;
export type TopProductBadge = (typeof TOP_PRODUCT_BADGES)[number];

export type AdminTopProductRow = {
  id: string;
  name: string;
  topOrder: number;
  topBadge: string | null;
  isActive: boolean;
  stockQuantity: number;
  imageThumbUrl?: string | null;
  imageCardUrl?: string | null;
  imageUrl?: string | null;
  business?: { displayName: string } | null;
};

type Props = {
  onChanged?: () => void;
};

export function AdminTopProductsPanel({ onChanged }: Props) {
  const token = authStorage.getAccessToken();
  const [items, setItems] = useState<AdminTopProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addId, setAddId] = useState('');
  const [addBadge, setAddBadge] = useState<TopProductBadge | ''>('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ items: AdminTopProductRow[] }>('/products/admin/top-products', token);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top mahsulotlarni yuklab bo‘lmadi');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistOrder = async (next: AdminTopProductRow[]) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        items: next.map((row, idx) => ({
          id: row.id,
          isTopProduct: true,
          topOrder: idx + 1,
          topBadge: row.topBadge,
        })),
      };
      const data = await api.patch<{ items: AdminTopProductRow[] }>(
        '/products/admin/top-products',
        payload,
        token,
      );
      setItems(data.items ?? next);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setItems(next);
    void persistOrder(next);
  };

  const removeFromTop = async (id: string) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(
        '/products/admin/top-products',
        { items: [{ id, isTopProduct: false, topOrder: 0, topBadge: null }] },
        token,
      );
      setItems((prev) => prev.filter((row) => row.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Olib tashlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const updateBadge = async (id: string, topBadge: string | null) => {
    if (!token) return;
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, topBadge } : row)));
    setSaving(true);
    try {
      await api.patch('/products/admin/top-products', { items: [{ id, topBadge }] }, token);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belgi yangilanmadi');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addById = async () => {
    const id = addId.trim();
    if (!id || !token) return;
    if (items.length >= 15) {
      setError('Eng ko‘pi bilan 15 ta top mahsulot');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(
        '/products/admin/top-products',
        {
          items: [
            {
              id,
              isTopProduct: true,
              topOrder: items.length + 1,
              topBadge: addBadge || null,
            },
          ],
        },
        token,
      );
      setAddId('');
      setAddBadge('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qo‘shib bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">🔥 Top mahsulotlar</h2>
          <p className="text-xs text-slate-500">Bosh sahifada ko‘rinadi · maks. 15 ta</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {items.length}/15
        </span>
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
          placeholder="Mahsulot ID (qo‘shish)"
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={addBadge}
          onChange={(e) => setAddBadge(e.target.value as TopProductBadge | '')}
        >
          <option value="">Belgisiz</option>
          {TOP_PRODUCT_BADGES.map((badge) => (
            <option key={badge} value={badge}>
              {badge}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={saving || !addId.trim()}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => void addById()}
        >
          Qo‘shish
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Yuklanmoqda…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Hozircha top mahsulot yo‘q.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((row, index) => (
            <li
              key={row.id}
              className="flex items-center gap-2 rounded-lg border border-white/80 bg-white p-2 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
                {index + 1}
              </span>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                <SafeImage
                  src={row.imageThumbUrl ?? row.imageCardUrl ?? row.imageUrl ?? undefined}
                  alt={row.name}
                  className="h-full w-full object-contain"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                <p className="truncate text-[10px] text-slate-500">
                  {row.business?.displayName ?? '—'} · qoldiq {row.stockQuantity}
                  {!row.isActive ? ' · nofaol' : ''}
                </p>
              </div>
              <select
                className="max-w-[88px] rounded border border-slate-200 px-1 py-1 text-[11px]"
                value={row.topBadge ?? ''}
                disabled={saving}
                onChange={(e) => void updateBadge(row.id, e.target.value || null)}
              >
                <option value="">—</option>
                {TOP_PRODUCT_BADGES.map((badge) => (
                  <option key={badge} value={badge}>
                    {badge}
                  </option>
                ))}
              </select>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  disabled={saving || index === 0}
                  className="rounded border border-slate-200 p-1 disabled:opacity-30"
                  aria-label="Yuqoriga"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={saving || index === items.length - 1}
                  className="rounded border border-slate-200 p-1 disabled:opacity-30"
                  aria-label="Pastga"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                disabled={saving}
                className="rounded p-1 text-slate-400 hover:text-rose-600"
                aria-label="Topdan olib tashlash"
                onClick={() => void removeFromTop(row.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
        <Star className="h-3 w-3 text-amber-500" />
        Jadvaldan mahsulotni tahrirlashda ham “Top” belgilash mumkin.
      </p>
    </div>
  );
}
