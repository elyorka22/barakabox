'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';

type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  description?: string | null;
  variants?: Array<{
    id: string;
    title: string;
    flavor?: string | null;
    size?: string | null;
    description?: string | null;
    price: number;
    stock: number;
    imageUrl?: string | null;
  }>;
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const list = await api.get<Product[]>('/products');
      setProduct(list.find((p) => p.id === params.id) ?? null);
    };
    void load();
  }, [params.id]);

  useEffect(() => {
    setImageLoaded(false);
  }, [product?.imageUrl, variantIndex]);

  const activeVariant = product?.variants?.[variantIndex] ?? null;

  const total = useMemo(
    () => (product ? Number(activeVariant?.price ?? product.price) * quantity : 0),
    [product, quantity, activeVariant],
  );

  const addToCart = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      await api.post(
        '/cart/items',
        { productId: product.id, variantId: activeVariant?.id, quantity },
        token,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <Link href="/" className="text-sm text-gray-500">Orqaga</Link>
        {(activeVariant?.imageUrl ?? product?.imageUrl) ? (
          <div className="relative mt-3 h-56 w-full overflow-hidden rounded-3xl">
            {!imageLoaded ? <div className="bb-skeleton absolute inset-0" /> : null}
            <img
              src={activeVariant?.imageUrl ?? product?.imageUrl ?? ''}
              alt={activeVariant?.title ?? product?.name ?? 'Product'}
              loading="lazy"
              decoding="async"
              className="h-56 w-full object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </div>
        ) : (
          <div className="mt-3 h-56 rounded-3xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <h1 className="mt-4 text-2xl font-bold text-[#121212]">{activeVariant?.title ?? product?.name ?? 'Mahsulot'}</h1>
        <p className="mt-1 text-sm text-gray-500">⭐ 4.8 • Yangi va sifatli mahsulot</p>
        <p className="mt-2 text-2xl font-bold text-[#121212]">{formatMoneyUz(activeVariant?.price ?? product?.price ?? 0)}</p>
        {product?.variants?.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {product.variants.map((variant, idx) => (
              <button
                key={variant.id}
                className={`rounded-full px-3 py-1 text-xs ${
                  idx === variantIndex ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setVariantIndex(idx)}
              >
                {variant.flavor ?? variant.title}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex w-fit items-center gap-4 rounded-2xl bg-white px-4 py-2 shadow-sm">
          <button className="text-xl font-bold" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span className="text-base font-semibold">{quantity}</span>
          <button className="text-xl font-bold" onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>
        <div
          className="fixed inset-x-0 z-20 bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]"
          style={{
            bottom: 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
          }}
        >
          <button onClick={addToCart} disabled={loading || !product} className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Qo'shilmoqda..." : `Savatga qo'shish • ${formatMoneyUz(total)}`}
          </button>
        </div>
      </section>
      <MobileNav />
    </main>
  );
}
