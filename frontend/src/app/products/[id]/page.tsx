'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';

type Product = { id: string; name: string; price: string; imageUrl?: string | null };

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const list = await api.get<Product[]>('/products');
      setProduct(list.find((p) => p.id === params.id) ?? null);
    };
    void load();
  }, [params.id]);

  const total = useMemo(() => (product ? Number(product.price) * quantity : 0), [product, quantity]);

  const addToCart = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      await api.post('/cart/items', { productId: product.id, quantity }, token);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <Link href="/" className="text-sm text-gray-500">Orqaga</Link>
        {product?.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="mt-3 h-56 w-full rounded-3xl object-cover" />
        ) : (
          <div className="mt-3 h-56 rounded-3xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <h1 className="mt-4 text-2xl font-bold text-[#121212]">{product?.name ?? 'Mahsulot'}</h1>
        <p className="mt-1 text-sm text-gray-500">⭐ 4.8 • Yangi va sifatli mahsulot</p>
        <p className="mt-2 text-2xl font-bold text-[#121212]">{formatMoneyUz(product?.price ?? 0)}</p>
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
