'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';
import { CartBottomSheet } from '@/components/cart-bottom-sheet';
import { CartLineCard, CartLineSkeleton } from '@/components/cart-line-card';
import type { CartSummaryRow } from '@/components/cart-summary';
import { bootstrapCart } from '@/lib/cart-store';
import { useCartHydrated, useCartItems } from '@/lib/use-cart-store';
import { computeDeliveryQuote } from '@/lib/delivery-pricing';
import { useDeliveryConfig } from '@/hooks/use-delivery-config';
import { cartCashbackEarnEstimate, cartSubtotal, countCashbackOfferLines } from '@/lib/cart-totals';
import { useGuestOrderTracking } from '@/hooks/use-guest-order-tracking';
import { GuestOrderCompletionBanner } from '@/components/order/guest-order-completion-banner';
import { GuestOrderTrackingPanel } from '@/components/order/guest-order-tracking-panel';

const NAV_BOTTOM = 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))';
/** Space for collapsed sheet (~138px) + small gap above nav */
const SCROLL_PAD_COLLAPSED = 'calc(10rem + var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))';

export function CartScreen() {
  const router = useRouter();
  const cartItems = useCartItems();
  const hydrated = useCartHydrated();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const { config: deliveryConfig } = useDeliveryConfig();
  const guestTracking = useGuestOrderTracking();

  useEffect(() => {
    void import('@/lib/analytics/client').then((m) => m.trackAnalytics('cart_opened', {}));
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setToken(authStorage.getAccessToken());
    });
    void bootstrapCart();
    return () => cancelAnimationFrame(id);
  }, []);

  const subtotal = useMemo(() => cartSubtotal(cartItems), [cartItems]);
  const deliveryQuote = useMemo(
    () => (deliveryConfig ? computeDeliveryQuote(subtotal, deliveryConfig) : null),
    [subtotal, deliveryConfig],
  );
  const delivery = deliveryQuote?.deliveryFee ?? 0;
  const grandTotal = deliveryQuote?.totalAmount ?? (subtotal > 0 ? subtotal + delivery : 0);
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

  const goQuickCheckout = () => {
    setError('');
    router.push('/checkout');
  };

  const showSkeleton = !hydrated || !guestTracking.hydrated;
  const empty = hydrated && cartItems.length === 0;
  const showOrderTracking = guestTracking.showTracking;
  const showCompletedFlash = guestTracking.showCompletedFlash;
  const trackingOnly = showOrderTracking && empty;

  return (
    <main className="min-h-dvh bg-[#F4F5F7]">
      <section
        className="mx-auto w-full max-w-lg px-4 pb-6 pt-3"
        style={{
          paddingBottom: trackingOnly || empty ? undefined : SCROLL_PAD_COLLAPSED,
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

        {showCompletedFlash && guestTracking.completedFlash ? (
          <GuestOrderCompletionBanner
            flash={guestTracking.completedFlash}
            onDismiss={guestTracking.dismissCompletedFlash}
          />
        ) : null}

        {earnEstimate > 0 && !empty && !trackingOnly && !showCompletedFlash ? (
          <div className="mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-emerald-50 via-white to-green-50/80 p-[1px] shadow-[0_6px_28px_rgba(22,163,74,0.12)]">
            <div className="rounded-[21px] bg-white/90 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800/90">Yetkazilgach keshbek</p>
              <p className="mt-1 text-[20px] font-extrabold tabular-nums text-[#15803d]">+{formatMoneyUz(earnEstimate)}</p>
              {cashbackLines > 0 ? (
                <p className="mt-1.5 text-[11px] text-slate-600">{cashbackLines} ta mahsulotda keshbek mavjud</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {showSkeleton ? (
            <>
              <CartLineSkeleton />
              <CartLineSkeleton />
            </>
          ) : trackingOnly ? (
            <GuestOrderTrackingPanel tracking={guestTracking} showHomeLink />
          ) : (
            <>
              {showOrderTracking ? (
                <GuestOrderTrackingPanel tracking={guestTracking} title="Faol buyurtma" />
              ) : null}
              {empty ? (
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
            </>
          )}
        </div>
      </section>

      {!empty && !trackingOnly ? (
        <CartBottomSheet
          bottom={NAV_BOTTOM}
          subtotal={subtotal}
          grandTotal={grandTotal}
          earnEstimate={earnEstimate}
          summaryRows={summaryRows}
          deliveryQuote={deliveryQuote}
          deliveryConfig={deliveryConfig}
          token={token}
          onQuickOrder={goQuickCheckout}
          checkoutDisabled={subtotal <= 0}
        />
      ) : null}

      <MobileNav />
    </main>
  );
}
