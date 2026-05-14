'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { CartSummary, FreeDeliveryProgressLine } from '@/components/cart-summary';
import type { CartSummaryRow } from '@/components/cart-summary';
import { DeliveryMethodCard } from '@/components/delivery-method-card';
import { formatMoneyUz } from '@/lib/format';
import type { CartItem } from '@/lib/cart-store';
import { enrichOrderLinesFromCart, saveLastOrderSnapshot } from '@/lib/last-order-storage';
import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  deliveryFeeFor,
  type DeliverySpeed,
} from '@/lib/delivery-pricing';
import { cartCashbackEarnEstimate, cartSubtotal } from '@/lib/cart-totals';
import { phoneDigitsForApi, isUzbekPhoneComplete, onPhoneUzInputChange } from '@/lib/phone-uz';

const STICKY_BOTTOM = 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))';

type GeoState = 'idle' | 'loading' | 'ok' | 'denied' | 'error' | 'unsupported';

function buildOrderAddress(input: {
  speed: DeliverySpeed;
  street: string;
  apartment: string;
  coords: { lat: number; lng: number } | null;
}): string {
  const method =
    input.speed === 'EXPRESS'
      ? 'Tezkor yetkazish (15–30 daqiqa)'
      : 'Oddiy yetkazish (1–2 soat)';
  const lines = [
    `[${method}]`,
    input.street.trim(),
    input.apartment.trim() ? `Xonadon / ofis: ${input.apartment.trim()}` : '',
    input.coords ? `Koordinata: ${input.coords.lat.toFixed(5)}, ${input.coords.lng.toFixed(5)}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function CheckoutScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>('STANDARD');
  const [placed, setPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [redeemInput, setRedeemInput] = useState('');
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const token = authStorage.getAccessToken();

  const subtotal = useMemo(() => cartSubtotal(cartItems), [cartItems]);
  const delivery = useMemo(() => deliveryFeeFor(deliverySpeed, subtotal), [deliverySpeed, subtotal]);
  const earnEstimate = useMemo(() => cartCashbackEarnEstimate(cartItems), [cartItems]);
  const redeemTiyin = useMemo(() => {
    const raw = Math.max(0, Math.floor(Number(redeemInput.replace(/\s/g, '')) || 0));
    return Math.min(raw, cashbackBalance, subtotal);
  }, [redeemInput, cashbackBalance, subtotal]);
  const total = Math.max(0, subtotal + delivery - redeemTiyin);

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
      { key: 'tot', label: 'Jami', value: formatMoneyUz(total), variant: 'total' },
    ],
    [subtotal, delivery, earnEstimate, total],
  );

  useEffect(() => {
    void (async () => {
      setCartLoading(true);
      try {
        const cartRes = await api.get<{ items: CartItem[] }>('/cart', token, true);
        setCartItems(cartRes.items ?? []);
      } catch {
        setCartItems([]);
      } finally {
        setCartLoading(false);
      }
    })();
  }, [token]);

  const apiPhone = phoneDigitsForApi(phone);
  useEffect(() => {
    const digits = phoneDigitsForApi(phone);
    if (!digits) {
      setCashbackBalance(0);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get<{ cashbackBalanceTiyin: number }>(
            `/customers/cashback-balance?phone=${encodeURIComponent(digits)}`,
          );
          setCashbackBalance(res.cashbackBalanceTiyin ?? 0);
        } catch {
          setCashbackBalance(0);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [phone]);

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('loading');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('ok');
      },
      (err) => {
        setGeoCoords(null);
        if (err?.code === 1) setGeoState('denied');
        else setGeoState('error');
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 },
    );
  };

  const addressOk = address.trim().length >= 4;
  const phoneOk = isUzbekPhoneComplete(phone);
  const geoOk = geoState === 'ok' && geoCoords !== null;
  const canSubmit = !loading && cartItems.length > 0 && phoneOk && addressOk && geoOk;

  const placeOrder = async () => {
    if (!canSubmit || !apiPhone) return;
    setLoading(true);
    setError('');
    try {
      const cartRes = await api.get<{ items: CartItem[] }>('/cart', token, true);
      const enrich = enrichOrderLinesFromCart(cartRes.items ?? []);
      const composedAddress = buildOrderAddress({
        speed: deliverySpeed,
        street: address,
        apartment,
        coords: geoCoords,
      });
      const order = await api.post<{
        id: string;
        cashbackEarnedSnapshotTiyin?: number;
        cashbackRedeemTiyin?: number;
        totalAmount?: number;
      }>(
        '/orders',
        {
          name: fullName.trim() || undefined,
          phone: apiPhone,
          address: composedAddress,
          deliverySpeed,
          cashbackRedeemTiyin: redeemTiyin > 0 ? redeemTiyin : undefined,
        },
        token,
      );
      saveLastOrderSnapshot(order, enrich);
      setPlaced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi. Qayta urinib ko'ring");
    } finally {
      setLoading(false);
    }
  };

  const standardPriceLabel =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 'Bepul' : formatMoneyUz(STANDARD_DELIVERY_FEE);
  const expressPriceLabel = formatMoneyUz(EXPRESS_DELIVERY_FEE);

  return (
    <main className="min-h-dvh bg-[#F4F5F7]">
      <section
        className="mx-auto w-full max-w-lg px-4 pb-6 pt-2"
        style={{
          paddingBottom: placed ? undefined : 'calc(11rem + var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
        }}
      >
        {!placed ? (
          <>
            <div className="flex items-center gap-1 pt-1">
              <Link
                href="/client"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition active:bg-slate-100"
                aria-label="Savatchaga qaytish"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} />
              </Link>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#121212]">Buyurtma</h1>
            </div>
            <p className="mt-1 pl-1 text-[13px] font-medium text-slate-500">Yetkazib berish ma&apos;lumotlari va to&apos;lov</p>

            {cartLoading ? (
              <div className="mt-5 space-y-3">
                <div className="h-40 animate-pulse rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100" />
                <div className="h-52 animate-pulse rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100" />
                <div className="h-36 animate-pulse rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="mt-8 rounded-[22px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
                <p className="text-[15px] font-semibold text-[#121212]">Savat bo&apos;sh</p>
                <p className="mt-1 text-[13px] text-slate-500">Avval mahsulot qo&apos;shing.</p>
                <Link href="/client" className="mt-4 inline-block text-sm font-semibold text-[#16A34A]">
                  Savatchaga o&apos;tish
                </Link>
              </div>
            ) : (
              <>
                {error ? (
                  <div
                    className="mt-4 rounded-[18px] border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-800"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] bg-white p-4 shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90">
                    <h2 className="text-[15px] font-bold text-[#121212]">Yetkazib berish</h2>
                    <p className="mt-0.5 text-[12px] text-slate-500">Manzil va aloqa</p>

                    <label className="mt-4 block text-[12px] font-semibold text-slate-600" htmlFor="co-name">
                      Ism
                    </label>
                    <input
                      id="co-name"
                      className="mt-1.5 w-full rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-[15px] text-[#121212] outline-none transition focus:border-[#16A34A] focus:bg-white focus:ring-2 focus:ring-[#16A34A]/20"
                      placeholder="Ism (ixtiyoriy)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />

                    <label className="mt-4 block text-[12px] font-semibold text-slate-800" htmlFor="co-phone">
                      Telefon raqam <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="co-phone"
                      className="mt-1.5 w-full rounded-[16px] border-2 border-slate-200 bg-white px-4 py-3.5 text-[15px] font-medium text-[#121212] outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                      placeholder="+998 90 123 45 67"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(onPhoneUzInputChange(e.target.value))}
                      aria-invalid={phone.length > 5 && !phoneOk}
                    />
                    {!phoneOk && phone.length > 0 ? (
                      <p className="mt-1 text-[11px] text-rose-600">To&apos;liq 12 raqamli raqam kiriting</p>
                    ) : null}

                    <p className="mt-5 text-[12px] font-semibold text-slate-800">
                      Joylashuv <span className="text-rose-600">*</span>
                    </p>
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={geoState === 'loading'}
                      className="mt-2 flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-[18px] bg-[#16A34A] px-4 text-[15px] font-bold text-white shadow-lg shadow-green-600/25 transition active:scale-[0.99] disabled:opacity-70"
                    >
                      {geoState === 'loading' ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                          Aniqlanmoqda…
                        </>
                      ) : (
                        <>
                          <MapPin className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                          Joylashuvni aniqlash
                        </>
                      )}
                    </button>
                    {geoState === 'ok' && geoCoords ? (
                      <p className="mt-2 flex items-start gap-2 rounded-[14px] bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-900">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        Joylashuv olindi ({geoCoords.lat.toFixed(4)}, {geoCoords.lng.toFixed(4)})
                      </p>
                    ) : null}
                    {geoState === 'denied' ? (
                      <p className="mt-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        Ruxsat berilmadi. Brauzer sozlamalaridan joylashuvni yoqing.
                      </p>
                    ) : null}
                    {geoState === 'error' ? (
                      <p className="mt-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        Joylashuvni olishda xatolik. Qayta urinib ko&apos;ring.
                      </p>
                    ) : null}
                    {geoState === 'unsupported' ? (
                      <p className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                        Brauzeringiz joylashuvni qo&apos;llab-quvvatlamaydi.
                      </p>
                    ) : null}

                    <label className="mt-5 block text-[12px] font-semibold text-slate-800" htmlFor="co-addr">
                      Manzil <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      id="co-addr"
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-[16px] border-2 border-slate-200 bg-white px-4 py-3 text-[15px] text-[#121212] outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                      placeholder="Ko'cha, uy, orientir…"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />

                    <label className="mt-4 block text-[12px] font-semibold text-slate-600" htmlFor="co-apt">
                      Xonadon / ofis
                    </label>
                    <input
                      id="co-apt"
                      className="mt-1.5 w-full rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-[15px] text-[#121212] outline-none transition focus:border-[#16A34A] focus:bg-white focus:ring-2 focus:ring-[#16A34A]/20"
                      placeholder="Ixcham ofis, qavat (ixtiyoriy)"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                    />
                  </div>

                  <div className="rounded-[22px] bg-white p-4 shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90">
                    <h2 className="text-[15px] font-bold text-[#121212]">Yetkazish turi</h2>
                    <p className="mt-0.5 text-[12px] text-slate-500">Narx darhol yangilanadi</p>
                    <div className="mt-4 space-y-3">
                      <DeliveryMethodCard
                        speed="EXPRESS"
                        selected={deliverySpeed === 'EXPRESS'}
                        onSelect={setDeliverySpeed}
                        title="Tezkor yetkazib berish"
                        subtitle="15–30 minut"
                        priceLabel={expressPriceLabel}
                        highlight
                      />
                      <DeliveryMethodCard
                        speed="STANDARD"
                        selected={deliverySpeed === 'STANDARD'}
                        onSelect={setDeliverySpeed}
                        title="Oddiy yetkazib berish"
                        subtitle="1–2 soat"
                        priceLabel={standardPriceLabel}
                      />
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white p-4 shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90">
                    <h2 className="text-[15px] font-bold text-[#121212]">Xulosa</h2>
                    <div className="mt-3">
                      <CartSummary rows={summaryRows} />
                    </div>
                    {deliverySpeed === 'STANDARD' && subtotal > 0 ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <FreeDeliveryProgressLine
                          subtotal={subtotal}
                          threshold={FREE_DELIVERY_THRESHOLD}
                          speed={deliverySpeed}
                        />
                      </div>
                    ) : null}
                    {cashbackBalance > 0 ? (
                      <div className="mt-4 rounded-[16px] border border-emerald-100 bg-emerald-50/70 p-3 text-[#14532d]">
                        <p className="text-xs font-semibold">Mavjud keshbek: {formatMoneyUz(cashbackBalance)}</p>
                        <label className="mt-2 block text-[11px] font-medium text-emerald-900" htmlFor="co-redeem">
                          Ishlatish (so&apos;mda)
                        </label>
                        <input
                          id="co-redeem"
                          className="mt-1 w-full rounded-[12px] border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300/50"
                          inputMode="numeric"
                          placeholder="0"
                          value={redeemInput}
                          onChange={(e) => setRedeemInput(e.target.value)}
                        />
                        <p className="mt-1 text-[11px] text-emerald-800">
                          Chegirma: {formatMoneyUz(redeemTiyin)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="mt-8 rounded-[24px] bg-white p-8 text-center shadow-[0_8px_32px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#16A34A]" strokeWidth={1.75} aria-hidden />
            <h2 className="mt-4 text-xl font-bold text-[#121212]">Buyurtma qabul qilindi</h2>
            <p className="mt-2 text-[14px] text-slate-500">Rahmat. Tez orada bog&apos;lanamiz.</p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#16A34A] px-8 text-[15px] font-semibold text-white"
            >
              Bosh sahifa
            </Link>
          </div>
        )}
      </section>

      {!placed && !cartLoading && cartItems.length > 0 ? (
        <div
          className="fixed inset-x-0 z-20 border-t border-slate-100/90 bg-white/95 backdrop-blur-md"
          style={{ bottom: STICKY_BOTTOM }}
        >
          <div className="mx-auto w-full max-w-lg px-4 py-3">
            <button
              type="button"
              className="flex min-h-[52px] w-full items-center justify-center rounded-[18px] bg-[#16A34A] text-[16px] font-bold text-white shadow-lg shadow-green-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              disabled={!canSubmit}
              onClick={placeOrder}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                  Yuborilmoqda…
                </>
              ) : (
                'Buyurtma berish'
              )}
            </button>
            <p className="mt-2 text-center text-[11px] font-medium text-slate-400">Ma&apos;lumotlaringiz himoyalangan</p>
          </div>
        </div>
      ) : null}

      <MobileNav />
    </main>
  );
}
