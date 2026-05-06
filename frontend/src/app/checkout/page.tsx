'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { formatMoneyUz } from '@/lib/format';

export default function CheckoutPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [placed, setPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = 39000;
  const delivery = 15000;
  const total = useMemo(() => subtotal + delivery, []);
  const token = authStorage.getAccessToken();

  const placeOrder = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(
        '/orders',
        {
          name: fullName.trim(),
          phone: phone.trim(),
          address: [address.trim(), apartment.trim()].filter(Boolean).join(', '),
        },
        token,
      );
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
              <Link href="/client" className="text-lg text-gray-600">←</Link>
              <h1 className="text-2xl font-bold text-[#121212]">Rasmiylashtirish</h1>
            </div>
            <div className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">Yetkazib berish ma'lumotlari</p>
              <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" placeholder="To'liq ism" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" placeholder="Telefon raqam" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" placeholder="Yetkazib berish manzili" value={address} onChange={(e) => setAddress(e.target.value)} />
              <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" placeholder="Xonadon / ofis (ixtiyoriy)" value={apartment} onChange={(e) => setApartment(e.target.value)} />
            </div>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">Buyurtma xulosasi</p>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Oraliq jami</span><span>{formatMoneyUz(subtotal)}</span></div>
                <div className="flex justify-between"><span>Yetkazib berish narxi</span><span>{formatMoneyUz(delivery)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#121212]"><span>Jami</span><span>{formatMoneyUz(total)}</span></div>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={!fullName || !phone || !address}
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
            <p className="mt-1 text-sm text-gray-500">Rahmat. Yetkazib berish 25-35 daqiqa ichida.</p>
            <p className="mt-3 rounded-xl bg-[#F9FAFB] p-2 text-xs text-gray-600">Buyurtma ID: #BBX-2024-000123</p>
            <button className="mt-4 w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white">Hisob yaratish</button>
            <Link href="/" className="mt-2 block text-sm font-medium text-gray-500">Keyinroq</Link>
          </div>
        )}
      </section>
      <MobileNav />
    </main>
  );
}
