'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';
import { CartLineCard, CartLineSkeleton } from '@/components/cart-line-card';
import { CartSummary, FreeDeliveryProgressLine } from '@/components/cart-summary';
import type { CartSummaryRow } from '@/components/cart-summary';
import { bootstrapCart, refreshCart } from '@/lib/cart-store';
import { enrichOrderLinesFromCart, saveLastOrderSnapshot } from '@/lib/last-order-storage';
import { useCartHydrated, useCartItems } from '@/lib/use-cart-store';
import {
  FREE_DELIVERY_THRESHOLD,
  deliveryFeeFor,
  type DeliverySpeed,
} from '@/lib/delivery-pricing';
import { cartCashbackEarnEstimate, cartSubtotal, countCashbackOfferLines } from '@/lib/cart-totals';

const STICKY_BOTTOM = 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))';

export function CartScreen() {
  const cartItems = useCartItems();
  const hydrated = useCartHydrated();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const speed: DeliverySpeed = 'STANDARD';

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setToken(authStorage.getAccessToken());
    });
    void bootstrapCart();
    return () => cancelAnimationFrame(id);
  }, []);

  const subtotal = useMemo(() => cartSubtotal(cartItems), [cartItems]);
  const delivery = useMemo(() => deliveryFeeFor(speed, subtotal), [subtotal]);
  const grandTotal = subtotal > 0 ? subtotal + delivery : 0;
  const earnEstimate = useMemo(() => cartCashbackEarnEstimate(cartItems), [cartItems]);
  const cashbackLines = useMemo(() => countCashbackOfferLines(cartItems), [cartItems]);

  const summaryRows: CartSummaryRow[] = useMemo(
    () => [
      { key: 'sub', label: 'Mahsulotlar', value: formatMoneyUz(subtotal) },
      {
        key: 'del',
        label: 'Yetkazib berish',
        value: subtotal <= 0 ? '—' : delivery === 0 ? 'Bepul' : formatMoneyUz(delivery),
        variant: 'muted',
      },
      ...(earnEstimate > 0
        ? ([
            {
              key: 'cb',
              label: 'Yetkazilgach keshbek (taxminan)',
              value: `+${formatMoneyUz(earnEstimate)}`,
              variant: 'accent' as const,
            },
          ] as CartSummaryRow[])
        : []),
      { key: 'tot', label: 'Jami', value: formatMoneyUz(grandTotal), variant: 'total' },
    ],
    [subtotal, delivery, earnEstimate, grandTotal],
  );

  const placeOrder = async () => {
    setPlacingOrder(true);
    setError('');
    try {
      const enrich = enrichOrderLinesFromCart(cartItems);
      const order = await api.post<unknown>('/orders', {}, token);
      saveLastOrderSnapshot(order, enrich);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rov muvaffaqiyatsiz yakunlandi");
    } finally {
      setPlacingOrder(false);
    }
  };

  const showSkeleton = !hydrated;
  const empty = hydrated && cartItems.length === 0;

  return (
    <main className="min-h-dvh bg-[#F4F5F7]">
      <section
        className="mx-auto w-full max-w-lg px-4 pb-6 pt-3"
        style={{
          paddingBottom: 'calc(14.5rem + var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
        }}
      >
        <header className="pt-1">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#121212]">Savatcha</h1>
          <p className="mt-1 text-[14px] font-medium text-slate-500">Mahsulotlarni tekshiring, keyin buyurtma bering.</p>
        </header>

        {error ? (
          <div
            className="mt-4 rounded-[20px] border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {earnEstimate > 0 && !empty ? (
          <div className="mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-emerald-50 via-white to-green-50/80 p-[1px] shadow-[0_6px_28px_rgba(22,163,74,0.12)]">
            <div className="rounded-[21px] bg-white/90 px-4 py-4 backdrop-blur-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-emerald-800/90">Yetkazilgach keshbek</p>
              <p className="mt-1 text-[22px] font-extrabold tabular-nums text-[#15803d]">+{formatMoneyUz(earnEstimate)}</p>
              {cashbackLines > 0 ? (
                <p className="mt-2 text-[12px] text-slate-600">
                  {cashbackLines} ta mahsulotda keshbek mavjud
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {showSkeleton ? (
            <>
              <CartLineSkeleton />
              <CartLineSkeleton />
            </>
          ) : empty ? (
            <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-14 text-center shadow-[0_8px_32px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/80">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <ShoppingBag className="h-8 w-8" strokeWidth={1.6} />
              </span>
              <p className="mt-5 text-[16px] font-bold text-[#121212]">Savatingiz bo&apos;sh</p>
              <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
                Mahsulot qo&apos;shing — yetkazib beramiz.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex min-h-12 min-w-[200px] items-center justify-center rounded-full bg-[#16A34A] px-6 text-[15px] font-semibold text-white shadow-lg shadow-green-600/25 transition active:scale-[0.98]"
              >
                Xarid qilish
              </Link>
            </div>
          ) : (
            cartItems.map((item) => <CartLineCard key={item.id} item={item} />)
          )}
        </div>
      </section>

      {!empty ? (
        <div
          className="fixed inset-x-0 z-20 border-t border-slate-100/90 bg-white/95 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md transition-[transform,opacity] duration-200"
          style={{ bottom: STICKY_BOTTOM }}
        >
          <div className="mx-auto w-full max-w-lg px-4 py-3">
            <CartSummary rows={summaryRows} />
            <div className="mt-3">
              <FreeDeliveryProgressLine
                subtotal={subtotal}
                threshold={FREE_DELIVERY_THRESHOLD}
                speed="STANDARD"
              />
            </div>
            <Link
              href="/checkout"
              className={`mt-4 flex min-h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-bold text-white shadow-lg transition active:scale-[0.99] ${
                placingOrder || subtotal <= 0 ? 'pointer-events-none bg-green-300 shadow-none' : 'bg-[#16A34A] shadow-green-600/30'
              }`}
            >
              Buyurtma berish
            </Link>
            <button
              type="button"
              className="mt-2.5 flex min-h-[48px] w-full items-center justify-center rounded-[18px] border border-slate-200 bg-white text-[14px] font-semibold text-slate-700 transition active:scale-[0.99] disabled:opacity-50"
              onClick={placeOrder}
              disabled={placingOrder || subtotal <= 0 || !token}
            >
              {placingOrder ? 'Jarayon…' : token ? 'Tezkor buyurtma' : 'Tezkor buyurtma (tizimga kiring)'}
            </button>
          </div>
        </div>
      ) : null}

      <MobileNav />
    </main>
  );
}
