'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { api, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { formatMoneyUz } from '@/lib/format';
import type { CartItem } from '@/lib/cart-store';
import { enrichOrderLinesFromCart, saveLastOrderSnapshot } from '@/lib/last-order-storage';
import { estimateLineCashbackTiyin } from '@/lib/cashback';

const FREE_THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD ?? 30000);
const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE ?? 3000);

function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (item.variant && item.product) return sum + Number(item.variant.price) * item.quantity;
    if (item.product) return sum + Number(item.product.price) * item.quantity;
    if (item.box) return sum + Number(item.box.price) * item.quantity;
    return sum;
  }, 0);
}

function cartCashbackEarnEstimate(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (item.variant?.product) {
      const line = Number(item.variant.price) * item.quantity;
      return (
        sum +
        estimateLineCashbackTiyin(
          line,
          item.variant.product.cashbackType ?? 'NONE',
          Number(item.variant.product.cashbackValue ?? 0),
        )
      );
    }
    if (item.product) {
      const line = Number(item.product.price) * item.quantity;
      return (
        sum +
        estimateLineCashbackTiyin(
          line,
          item.product.cashbackType ?? 'NONE',
          Number(item.product.cashbackValue ?? 0),
        )
      );
    }
    return sum;
  }, 0);
}

export default function CheckoutPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [placed, setPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [redeemInput, setRedeemInput] = useState('');
  const token = authStorage.getAccessToken();

  const subtotal = useMemo(() => cartSubtotal(cartItems), [cartItems]);
  const delivery = subtotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const earnEstimate = useMemo(() => cartCashbackEarnEstimate(cartItems), [cartItems]);
  const redeemTiyin = useMemo(() => {
    const raw = Math.max(0, Math.floor(Number(redeemInput.replace(/\s/g, '')) || 0));
    return Math.min(raw, cashbackBalance, subtotal);
  }, [redeemInput, cashbackBalance, subtotal]);
  const total = Math.max(0, subtotal + delivery - redeemTiyin);

  useEffect(() => {
    void (async () => {
      try {
        const cartRes = await api.get<{ items: CartItem[] }>('/cart', token, true);
        setCartItems(cartRes.items ?? []);
      } catch {
        setCartItems([]);
      }
    })();
  }, [token]);

  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setCashbackBalance(0);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get<{ cashbackBalanceTiyin: number }>(
            `/customers/cashback-balance?phone=${encodeURIComponent(phone)}`,
          );
          setCashbackBalance(res.cashbackBalanceTiyin ?? 0);
        } catch {
          setCashbackBalance(0);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [phone]);

  const placeOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const cartRes = await api.get<{ items: CartItem[] }>('/cart', token, true);
      const enrich = enrichOrderLinesFromCart(cartRes.items ?? []);
      const order = await api.post<{
        id: string;
        cashbackEarnedSnapshotTiyin?: number;
        cashbackRedeemTiyin?: number;
        totalAmount?: number;
      }>(
        '/orders',
        {
          name: fullName.trim(),
          phone: phone.trim(),
          address: [address.trim(), apartment.trim()].filter(Boolean).join(', '),
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

  return (
    <main className="bb-page">
      <section className="bb-shell pb-24">
        {!placed ? (
          <>
            <div className="flex items-center gap-2">
              <Link href="/client" className="text-lg text-gray-600">
                ←
              </Link>
              <h1 className="text-2xl font-bold text-[#121212]">Rasmiylashtirish</h1>
            </div>
            <div className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">{"Yetkazib berish ma'lumotlari"}</p>
              <input
                className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                placeholder={"To'liq ism"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                placeholder="Telefon raqam"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                placeholder="Yetkazib berish manzili"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <input
                className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                placeholder="Xonadon / ofis (ixtiyoriy)"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">Buyurtma xulosasi</p>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Oraliq jami</span>
                  <span>{formatMoneyUz(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Yetkazib berish narxi</span>
                  <span>{delivery === 0 ? 'Bepul' : formatMoneyUz(delivery)}</span>
                </div>
                {earnEstimate > 0 ? (
                  <div className="flex justify-between text-emerald-700">
                    <span>Yetkazilgach keshbek (taxminan)</span>
                    <span>+{formatMoneyUz(earnEstimate)}</span>
                  </div>
                ) : null}
                {cashbackBalance > 0 ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[#14532d]">
                    <p className="text-xs font-medium">Mavjud keshbek: {formatMoneyUz(cashbackBalance)}</p>
                    <label className="mt-2 block text-xs text-emerald-900">Ishlatish (so&apos;mda, bo&apos;sh qoldiring)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                      inputMode="numeric"
                      placeholder="0"
                      value={redeemInput}
                      onChange={(e) => setRedeemInput(e.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-emerald-800">
                      Chegirma: {formatMoneyUz(redeemTiyin)} (oraliq jami va balansdan oshmaydi)
                    </p>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#121212]">
                  <span>Jami</span>
                  <span>{formatMoneyUz(total)}</span>
                </div>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={!fullName || !phone || !address || cartItems.length === 0}
              onClick={placeOrder}
            >
              {loading ? 'Yuborilmoqda...' : 'Buyurtma berish'}
            </button>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </>
        ) : (
          <div className="mt-4 rounded-3xl bg-white p-5 text-center shadow-sm">
            <p className="text-5xl">✅</p>
            <h2 className="mt-3 text-xl font-bold text-[#121212]">Buyurtma qabul qilindi!</h2>
            <p className="mt-1 text-sm text-gray-500">Rahmat. Yetkazib berish tez orada.</p>
            <Link href="/" className="mt-4 block text-sm font-medium text-[#16A34A]">
              Bosh sahifa
            </Link>
          </div>
        )}
      </section>
      <MobileNav />
    </main>
  );
}
