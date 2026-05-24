'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage, isApiError } from '@/lib/api';
import { StoreListingsPanel } from '@/components/business/store-listings-panel';
import { formatMoneyUz } from '@/lib/format';

type CatalogVariant = {
  id: string;
  type: string;
  value: string;
  alreadyListed: boolean;
};

type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  hasVariants: boolean;
  alreadyListed: boolean;
  variants: CatalogVariant[];
};

type BrowseResponse = {
  items: CatalogProduct[];
  total: number;
};

type Listing = {
  id: string;
  price: number;
  stock: number;
  isVisible: boolean;
  globalProduct: { name: string; brand: string | null };
  globalVariant: { type: string; value: string } | null;
};

export function BusinessMarketplaceCatalogPanel() {
  const [browse, setBrowse] = useState<CatalogProduct[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      const q = search.trim();
      if (q) params.set('q', q);
      const [browseRes, listingRes] = await Promise.all([
        api.get<BrowseResponse>(`/businesses/catalog/browse?${params}`, token),
        api.get<Listing[]>('/businesses/catalog/listings', token),
      ]);
      setBrowse(Array.isArray(browseRes?.items) ? browseRes.items : []);
      setListings(Array.isArray(listingRes) ? listingRes : []);
    } catch (e) {
      if (isApiError(e)) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const addListing = async (product: CatalogProduct, variant?: CatalogVariant) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const priceRaw = window.prompt('Narx (so‘m):', '10000');
    if (!priceRaw) return;
    const price = Number(priceRaw.replace(/\s/g, ''));
    if (!Number.isFinite(price) || price < 1) return;
    const stockRaw = window.prompt('Ombor (dona):', '10');
    const stock = Number(stockRaw?.replace(/\s/g, '') || 0);
    const key = variant?.id ?? product.id;
    setBusyId(key);
    setError('');
    try {
      await api.post(
        '/businesses/catalog/listings',
        {
          globalProductId: product.id,
          globalVariantId: variant?.id,
          price,
          stock: Number.isFinite(stock) ? stock : 0,
          isVisible: true,
        },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qo‘shilmadi');
    } finally {
      setBusyId('');
    }
  };

  const toggleVisible = async (listing: Listing) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setBusyId(listing.id);
    try {
      await api.patch(
        `/businesses/catalog/listings/${listing.id}`,
        { isVisible: !listing.isVisible },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="space-y-3 border-b border-slate-200 pb-4">
      <div>
        <h2 className="text-sm font-semibold text-[#111827]">Global katalog</h2>
        <p className="text-xs text-slate-500">
          Narx va omborni siz belgilaysiz. Nom va rasm platforma katalogida.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <input
          className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
          placeholder="Qidiruv…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load();
          }}
        />
        <button
          type="button"
          className="rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white"
          onClick={() => void load()}
        >
          Qidirish
        </button>
      </div>

      {loading ? (
        <div className="h-12 animate-pulse rounded-xl bg-white" />
      ) : (
        <>
          {listings.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Do‘kondagi listinglar</p>
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {l.globalProduct.name}
                      {l.globalVariant ? ` (${l.globalVariant.value})` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMoneyUz(l.price)} · {l.stock} dona
                      {!l.isVisible ? ' · yashirin' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === l.id}
                    className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium"
                    onClick={() => void toggleVisible(l)}
                  >
                    {l.isVisible ? 'Yashirish' : 'Ko‘rsatish'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Katalogdan qo‘shish</p>
            {browse.length === 0 ? (
              <p className="text-sm text-slate-500">Mahsulot topilmadi</p>
            ) : (
              browse.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]"
                >
                  <p className="text-sm font-medium">
                    {p.name}
                    {p.brand ? (
                      <span className="ml-1 text-xs font-normal text-slate-500">{p.brand}</span>
                    ) : null}
                  </p>
                  {p.hasVariants ? (
                    <ul className="mt-2 space-y-1">
                      {p.variants.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600">
                            {v.type}: {v.value}
                          </span>
                          {v.alreadyListed ? (
                            <span className="text-xs text-slate-400">Qo‘shilgan</span>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === v.id}
                              className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                              onClick={() => void addListing(p, v)}
                            >
                              Qo‘shish
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : p.alreadyListed ? (
                    <p className="mt-1 text-xs text-slate-400">Qo‘shilgan</p>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                      onClick={() => void addListing(p)}
                    >
                      Qo‘shish
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <StoreListingsPanel />
        </>
      )}
    </section>
  );
}
