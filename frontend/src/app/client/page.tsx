'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';

type CartResponse = {
  items: Array<{
    id: string;
    quantity: number;
    product?: { id: string; name: string; price: string } | null;
    variant?: { id: string; flavor?: string | null; title?: string | null; description?: string | null; imageUrl?: string | null; price: number } | null;
    box?: { id: string; name: string; price: string } | null;
  }>;
};

export default function ClientPage() {
  const deliveryFee = 15000;
  const [token, setToken] = useState('');
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = authStorage.getAccessToken();
    setToken(savedToken);
    void loadCart(savedToken);
  }, []);

  const withLoading = async (task: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rov muvaffaqiyatsiz yakunlandi");
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async (activeToken?: string) => {
    await withLoading(async () => {
      const data = await api.get<CartResponse>('/cart', activeToken ?? token, true);
      setCart(data);
    });
  };

  const placeOrder = async () => {
    await withLoading(async () => {
      await api.post('/orders', {}, token);
      await loadCart();
    });
  };

  const updateCartItemQty = async (variantId: string | undefined, productId: string | undefined, quantity: number) => {
    const existing = cart?.items.find((i) => (variantId ? i.variant?.id === variantId : i.product?.id === productId));
    if (!existing) return;
    if (quantity <= 0) {
      await withLoading(async () => {
        await api.delete('/cart/items', { productId, variantId }, token);
        await loadCart();
      });
      return;
    }
    const diff = quantity - existing.quantity;
    await withLoading(async () => {
      await api.post('/cart/items', { productId, variantId, quantity: diff }, token);
      await loadCart();
    });
  };

  const cartTotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      if (item.variant && item.product) return sum + Number(item.variant.price) * item.quantity;
      if (item.product) return sum + Number(item.product.price) * item.quantity;
      if (item.box) return sum + Number(item.box.price) * item.quantity;
      return sum;
    }, 0);
  }, [cart]);

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <h1 className="text-2xl font-bold text-[#121212]">Savat</h1>
        <p className="mt-1 text-sm text-gray-500">Mahsulotlarni tekshiring va rasmiylashtiring.</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 space-y-3">
          {!cart || cart.items.length === 0 ? (
            <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
              <p className="text-sm text-gray-500">Savatingiz hozircha bo'sh.</p>
            </div>
          ) : null}
          {cart?.items.map((item) => {
            const title = item.product ? item.product.name : item.box?.name ?? "Noma'lum";
            const price = item.variant ? Number(item.variant.price) : Number(item.product?.price ?? item.box?.price ?? 0);
            return (
              <article key={item.id} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.variant?.imageUrl ? (
                      <img
                        src={item.variant.imageUrl}
                        alt={item.variant.flavor ?? item.variant.title ?? title}
                        className="h-11 w-11 rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <div>
                    <h3 className="text-sm font-semibold text-[#121212]">{title}</h3>
                    {item.variant?.flavor || item.variant?.title ? (
                      <p className="text-xs text-slate-500">{item.variant.flavor ?? item.variant.title}</p>
                    ) : null}
                    <p className="text-xs text-gray-500">{formatMoneyUz(price)} / dona</p>
                    </div>
                  </div>
                  {item.product ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="h-8 w-8 rounded-full bg-[#F3F4F6] font-bold"
                        onClick={() => updateCartItemQty(item.variant?.id, item.product!.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        className="h-8 w-8 rounded-full bg-[#F3F4F6] font-bold"
                        onClick={() => updateCartItemQty(item.variant?.id, item.product!.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-xl bg-[#F3F4F6] px-3 py-1 text-xs font-semibold">{item.quantity}x</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div
          className="fixed inset-x-0 z-20 bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]"
          style={{
            bottom: 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto w-full">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>Oraliq jami</span>
              <span className="font-semibold">{formatMoneyUz(cartTotal)}</span>
            </div>
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>Yetkazib berish narxi</span>
              <span className="font-semibold">{formatMoneyUz(deliveryFee)}</span>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm text-gray-800">
              <span>Jami</span>
              <span className="text-lg font-bold">{formatMoneyUz(cartTotal + (cartTotal > 0 ? deliveryFee : 0))}</span>
            </div>
            <Link href="/checkout" className={`block w-full rounded-2xl py-3 text-center text-sm font-semibold text-white ${loading || cartTotal <= 0 ? 'pointer-events-none bg-green-300' : 'bg-[#16A34A]'}`}>
              Rasmiylashtirishga o'tish
            </Link>
            <button className="mt-2 w-full rounded-2xl border border-gray-200 py-2 text-xs font-medium text-gray-600 disabled:opacity-60" onClick={placeOrder} disabled={loading || cartTotal <= 0 || !token}>
              {loading ? 'Jarayon davom etmoqda...' : token ? 'Tezkor buyurtma' : "Tezkor buyurtma (faqat kirganlar uchun)"}
            </button>
          </div>
        </div>
      </section>
      <MobileNav />
    </main>
  );
}
