'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, authStorage, isApiError } from '@/lib/api';
import { SafeImage } from '@/components/safe-image';
import { normalizeAssetUrl } from '@/lib/asset-url';

type Category = { id: string; name: string };

type CatalogItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  imageThumbUrl: string | null;
  defaultPrice: number;
  defaultStock: number;
  hasVariants: boolean;
  alreadyListed: boolean;
  category: { id: string; name: string } | null;
};

type BrowseResponse = {
  items: CatalogItem[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = {
  onImported: () => void;
};

export function BusinessImportCatalogPanel({ onImported }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<Category[]>('/categories?active=true');
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '48');
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (categoryId) params.set('categoryId', categoryId);
      const res = await api.get<BrowseResponse>(`/businesses/catalog/browse?${params}`, token);
      const list = (res.items ?? []).filter((p) => !p.hasVariants && !p.alreadyListed);
      setItems((prev) => (page === 1 ? list : [...prev, ...list.filter((p) => !prev.some((x) => x.id === p.id))]));
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Yuklab bo‘lmadi');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const done = async () => {
    if (selected.size === 0) return;
    const token = authStorage.getAccessToken();
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post<{ created: number; skipped: number }>(
        '/businesses/catalog/listings/bulk',
        { globalProductIds: [...selected] },
        token,
      );
      setSuccess(`${res.created} ta mahsulot qo‘shildi`);
      setSelected(new Set());
      onImported();
      await loadProducts();
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative pb-24">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">Mahsulotlarni import qilish</h2>
          <p className="text-xs text-slate-500">Rasm va nom platformada — narx/ombor avtomatik.</p>
        </div>

        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          placeholder="Qidirish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {categories.length > 0 ? (
          <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                !categoryId ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              Barchasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  categoryId === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 shadow-sm'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {success ? <p className="text-xs text-emerald-600">{success}</p> : null}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">Mahsulot topilmadi</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {items.map((item) => {
            const picked = selected.has(item.id);
            const img = item.imageThumbUrl ?? item.imageUrl;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`relative w-full overflow-hidden rounded-xl bg-white text-left shadow-sm ring-2 transition active:scale-[0.98] ${
                    picked ? 'ring-emerald-600' : 'ring-transparent'
                  }`}
                >
                  <div className="aspect-square bg-slate-50 p-1">
                    {img ? (
                      <SafeImage
                        src={normalizeAssetUrl(img)}
                        alt={item.name}
                        className="h-full w-full object-contain"
                        sizes="120px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl">📦</span>
                    )}
                  </div>
                  <p className="line-clamp-2 px-1.5 py-1.5 text-[10px] font-medium leading-tight text-[#111827]">
                    {item.name}
                  </p>
                  {picked ? (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {page < totalPages ? (
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700"
          onClick={() => setPage((p) => p + 1)}
        >
          Ko‘proq yuklash
        </button>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          disabled={selected.size === 0 || saving}
          onClick={() => void done()}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda…' : `Tayyor (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
