'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { MobileNav } from '@/components/app-nav';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};

type CategoryProductsResponse = {
  category: { id: string; name: string; slug: string };
  items: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type CartResponse = {
  items: Array<{ quantity: number; product?: { id: string } | null; variant?: { id: string } | null }>;
};

export default function CategoryProductsPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<CategoryProductsResponse | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const token = authStorage.getAccessToken();

  const load = async (targetPage: number) => {
    setLoading(true);
    try {
      const payload = await api.get<CategoryProductsResponse>(
        `/categories/${params.slug}/products?page=${targetPage}&limit=12`,
      );
      setData(payload);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const payload = await api.get<CartResponse>('/cart', token, true);
      setCart(payload);
    } catch {
      setCart(null);
    }
  };

  useEffect(() => {
    void load(page);
    void loadCart();
  }, [page, params.slug]);

  const quantityByVariantId = useMemo(() => {
    const map: Record<string, number> = {};
    if (!cart) return map;
    for (const item of cart.items) {
      if (item.variant?.id) {
        map[item.variant.id] = (map[item.variant.id] ?? 0) + item.quantity;
      }
    }
    return map;
  }, [cart]);

  const addToCart = async (variantId: string, productId: string, quantity = 1) => {
    setAdding(true);
    try {
      await api.post('/cart/items', { productId, variantId, quantity }, token);
      await loadCart();
    } finally {
      setAdding(false);
    }
  };

  const renderableItems = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) =>
          Array.isArray(item.variants) &&
          item.variants.length > 0 &&
          item.variants.some((variant) => Boolean(variant.id)),
      ),
    [data?.items],
  );

  return (
    <main className="bb-page">
      <section className="bb-shell pb-24">
        <Link href="/" className="text-sm text-gray-500">
          Orqaga
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[#121212]">{data?.category.name ?? 'Kategoriya'}</h1>
        {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-white p-3">
                <div className="bb-skeleton h-28" />
                <div className="bb-skeleton mt-3 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {renderableItems.length ? (
              renderableItems.map((item) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={String(item.price)}
                  onAdd={(variantId, productId) => void addToCart(variantId, productId, 1)}
                  variants={item.variants?.map((variant) => ({
                    ...variant,
                    imageUrl: variant.imageUrl ?? item.imageCardUrl ?? item.imageUrl,
                  }))}
                  onIncrease={(variantId, productId) => void addToCart(variantId, productId, 1)}
                  onDecrease={(variantId, productId) => void addToCart(variantId, productId, -1)}
                  quantityByVariantId={quantityByVariantId}
                  loading={adding}
                  href={`/products/${item.id}`}
                  imageUrl={item.imageCardUrl ?? item.imageUrl}
                />
              ))
            ) : (
              <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                Mahsulotlar mavjud emas
              </div>
            )}
          </div>
        )}
        {data ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              Oldingi
            </button>
            <span className="text-xs text-slate-500">
              {data.pagination.page} / {data.pagination.totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Keyingi
            </button>
          </div>
        ) : null}
      </section>
      <MobileNav />
    </main>
  );
}
