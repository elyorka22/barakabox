'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronLeft, Loader2, Map, MapPin, Trash2 } from 'lucide-react';
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
import { geolocationErrorMessageUz, insecureGeoMessageUz, reverseGeocodeOsm, shortenAddressLine } from '@/lib/checkout-geo';
import { phoneDigitsForApi, isUzbekPhoneComplete, onPhoneUzInputChange } from '@/lib/phone-uz';

const STICKY_BOTTOM = 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))';

type GeoState = 'idle' | 'loading' | 'ok' | 'denied' | 'error' | 'unsupported' | 'insecure' | 'timeout' | 'unavailable';

export type SavedCustomerAddress = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

function buildOrderAddress(input: { speed: DeliverySpeed; street: string; apartment: string }): string {
  const method =
    input.speed === 'EXPRESS'
      ? 'Tezkor yetkazish (15–30 daqiqa)'
      : 'Oddiy yetkazish (1–2 soat)';
  const lines = [
    `[${method}]`,
    input.street.trim(),
    input.apartment.trim() ? `Xonadon / ofis: ${input.apartment.trim()}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function CheckoutScreen() {
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>('STANDARD');

  useEffect(() => {
    const s = searchParams.get('speed');
    if (s === 'EXPRESS') setDeliverySpeed('EXPRESS');
    else if (s === 'STANDARD') setDeliverySpeed('STANDARD');
  }, [searchParams]);
  const [placed, setPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [redeemInput, setRedeemInput] = useState('');
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formattedOsmAddress, setFormattedOsmAddress] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState('Uy');
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

  useEffect(() => {
    if (!apiPhone) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    setAddressesLoading(true);
    void (async () => {
      try {
        const list = await api.get<SavedCustomerAddress[]>(
          `/customers/addresses?phone=${encodeURIComponent(apiPhone)}`,
          token,
        );
        if (!cancelled) setSavedAddresses(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSavedAddresses([]);
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPhone, token]);

  const requestLocation = () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setGeoState('insecure');
      setGeoCoords(null);
      setFormattedOsmAddress(null);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unsupported');
      return;
    }
    setSelectedSavedId(null);
    setGeoState('loading');
    setReverseLoading(false);
    setFormattedOsmAddress(null);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoCoords({ lat, lng });
        setGeoState('ok');
        setReverseLoading(true);
        void (async () => {
          const line = await reverseGeocodeOsm(lat, lng);
          setFormattedOsmAddress(line);
          setAddress((prev) => {
            const p = prev.trim();
            if (p.length >= 4) return prev;
            return line ?? prev;
          });
          setReverseLoading(false);
        })();
      },
      (err: GeolocationPositionError) => {
        setGeoCoords(null);
        setFormattedOsmAddress(null);
        const c = err?.code;
        if (c === 1) setGeoState('denied');
        else if (c === 2) setGeoState('unavailable');
        else if (c === 3) setGeoState('timeout');
        else setGeoState('error');
      },
      { enableHighAccuracy: true, timeout: 16_000, maximumAge: 30_000 },
    );
  };

  const applySavedAddress = (row: SavedCustomerAddress) => {
    setSelectedSavedId(row.id);
    setGeoCoords({ lat: row.latitude, lng: row.longitude });
    setGeoState('ok');
    setFormattedOsmAddress(row.address?.trim() ? row.address : null);
    setAddress(row.address?.trim() ? row.address : '');
    setReverseLoading(false);
  };

  const deleteSavedAddress = async (id: string) => {
    if (!apiPhone) return;
    try {
      await api.delete<{ ok: boolean }>(
        `/customers/addresses/${encodeURIComponent(id)}?phone=${encodeURIComponent(apiPhone)}`,
        {},
        token,
      );
      setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
      if (selectedSavedId === id) {
        setSelectedSavedId(null);
      }
    } catch {
      // ignore
    }
  };

  const setDefaultSavedAddress = async (id: string) => {
    if (!apiPhone) return;
    try {
      const next = await api.patch<SavedCustomerAddress[]>(
        `/customers/addresses/${encodeURIComponent(id)}/default?phone=${encodeURIComponent(apiPhone)}`,
        {},
        token,
      );
      if (Array.isArray(next)) setSavedAddresses(next);
    } catch {
      // ignore
    }
  };

  const addressOk = address.trim().length >= 4;
  const phoneOk = isUzbekPhoneComplete(phone);
  const geoOk = geoState === 'ok' && geoCoords !== null;
  const canSubmit = !loading && cartItems.length > 0 && phoneOk && addressOk && geoOk;

  const orderAddressLabel = useMemo(() => {
    if (selectedSavedId) {
      const row = savedAddresses.find((a) => a.id === selectedSavedId);
      return row?.label?.trim() || undefined;
    }
    if (saveAddressChecked && saveAddressLabel.trim()) return saveAddressLabel.trim();
    return undefined;
  }, [selectedSavedId, savedAddresses, saveAddressChecked, saveAddressLabel]);

  const placeOrder = async () => {
    if (!canSubmit || !apiPhone || !geoCoords) return;
    setLoading(true);
    setError('');
    try {
      const cartRes = await api.get<{ items: CartItem[] }>('/cart', token, true);
      const enrich = enrichOrderLinesFromCart(cartRes.items ?? []);
      const composedAddress = buildOrderAddress({
        speed: deliverySpeed,
        street: address,
        apartment,
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
          latitude: geoCoords.lat,
          longitude: geoCoords.lng,
          formattedAddress: formattedOsmAddress?.trim() || undefined,
          deliveryNote: apartment.trim() || undefined,
          addressLabel: orderAddressLabel,
          deliverySpeed,
          cashbackRedeemTiyin: redeemTiyin > 0 ? redeemTiyin : undefined,
        },
        token,
      );
      saveLastOrderSnapshot(order, enrich);
      if (saveAddressChecked && apiPhone) {
        const label = saveAddressLabel.trim() || 'Manzil';
        try {
          await api.post(
            '/customers/addresses',
            {
              phone: apiPhone,
              label,
              address: address.trim(),
              latitude: geoCoords.lat,
              longitude: geoCoords.lng,
              isDefault: savedAddresses.length === 0,
            },
            token,
          );
        } catch {
          // duplicate or validation — ignore after successful order
        }
      }
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

                    {apiPhone && phoneOk ? (
                      <div className="mt-4">
                        <p className="text-[12px] font-semibold text-slate-800">Saqlangan manzillar</p>
                        {addressesLoading ? (
                          <p className="mt-2 text-[11px] text-slate-500">Yuklanmoqda…</p>
                        ) : savedAddresses.length === 0 ? (
                          <p className="mt-1 text-[11px] text-slate-500">Hozircha saqlangan manzil yo&apos;q</p>
                        ) : (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {savedAddresses.map((row) => (
                              <div key={row.id} className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() => applySavedAddress(row)}
                                  className={`flex max-w-[10.5rem] flex-col rounded-[14px] border px-3 py-2 text-left transition active:scale-[0.98] ${
                                    selectedSavedId === row.id
                                      ? 'border-[#16A34A] bg-green-50 ring-2 ring-[#16A34A]/20'
                                      : 'border-slate-200 bg-slate-50/90'
                                  }`}
                                >
                                  <span className="text-[12px] font-bold text-[#121212]">
                                    {row.label}
                                    {row.isDefault ? (
                                      <span className="ml-1 text-[10px] font-semibold text-emerald-700">· asosiy</span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 line-clamp-2 text-[10px] text-slate-600">
                                    {shortenAddressLine(row.address || `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`, 72)}
                                  </span>
                                </button>
                                <div className="absolute -right-1 -top-1 flex gap-0.5">
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-amber-600 shadow ring-1 ring-slate-200"
                                    aria-label="Asosiy qilish"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void setDefaultSavedAddress(row.id);
                                    }}
                                  >
                                    ★
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200"
                                    aria-label="O‘chirish"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void deleteSavedAddress(row.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                      <div className="mt-3 rounded-[16px] border border-emerald-100 bg-emerald-50/90 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <Map className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={2} aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-emerald-900">Joylashuv aniqlandi</p>
                            <p className="mt-0.5 text-[11px] font-medium leading-snug text-emerald-950/90">
                              {reverseLoading
                                ? 'Manzil matni yuklanmoqda…'
                                : shortenAddressLine(
                                    formattedOsmAddress ||
                                      address.trim() ||
                                      `${geoCoords.lat.toFixed(5)}, ${geoCoords.lng.toFixed(5)}`,
                                    96,
                                  )}
                            </p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                        </div>
                      </div>
                    ) : null}
                    {geoState === 'denied' ? (
                      <div className="mt-2 space-y-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        <p>{geolocationErrorMessageUz(1)}</p>
                        <button
                          type="button"
                          className="text-[12px] font-semibold text-rose-900 underline"
                          onClick={requestLocation}
                        >
                          Qayta urinish
                        </button>
                      </div>
                    ) : null}
                    {geoState === 'timeout' ? (
                      <div className="mt-2 space-y-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        <p>{geolocationErrorMessageUz(3)}</p>
                        <button type="button" className="font-semibold underline" onClick={requestLocation}>
                          Qayta urinish
                        </button>
                      </div>
                    ) : null}
                    {geoState === 'unavailable' ? (
                      <div className="mt-2 space-y-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        <p>{geolocationErrorMessageUz(2)}</p>
                        <button type="button" className="font-semibold underline" onClick={requestLocation}>
                          Qayta urinish
                        </button>
                      </div>
                    ) : null}
                    {geoState === 'error' ? (
                      <div className="mt-2 space-y-2 rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        <p>{geolocationErrorMessageUz(undefined)}</p>
                        <button type="button" className="font-semibold underline" onClick={requestLocation}>
                          Qayta urinish
                        </button>
                      </div>
                    ) : null}
                    {geoState === 'unsupported' ? (
                      <p className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                        Brauzeringiz joylashuvni qo&apos;llab-quvvatlamaydi.
                      </p>
                    ) : null}
                    {geoState === 'insecure' ? (
                      <p className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                        {insecureGeoMessageUz()}
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
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setSelectedSavedId(null);
                      }}
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

                    <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50/80 px-3 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A]"
                          checked={saveAddressChecked}
                          onChange={(e) => setSaveAddressChecked(e.target.checked)}
                        />
                        <span className="text-[13px] font-semibold text-[#121212]">Manzilni saqlash</span>
                      </label>
                      {saveAddressChecked ? (
                        <div className="mt-2">
                          <label className="text-[11px] font-medium text-slate-600" htmlFor="co-save-label">
                            Sarlavha (Uy, Ofis…)
                          </label>
                          <input
                            id="co-save-label"
                            className="mt-1 w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                            value={saveAddressLabel}
                            onChange={(e) => setSaveAddressLabel(e.target.value)}
                            placeholder="Uy"
                          />
                        </div>
                      ) : null}
                    </div>
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
