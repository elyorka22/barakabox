'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';

type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: string; fullName: string };
};

function normalizeRole(role?: string): 'client' | 'business' | 'admin' | 'courier' | 'picker' {
  if (!role) return 'client';
  const normalized = role.toLowerCase();
  if (normalized === 'client') return 'client';
  if (normalized === 'business') return 'business';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'courier') return 'courier';
  if (normalized === 'picker') return 'picker';
  return 'client';
}

export default function ProfilePage() {
  const [email, setEmail] = useState('client@barakabox.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(authStorage.getUser() as LoginResponse['user'] | null);
  }, []);

  const login = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      authStorage.setAccessToken(data.accessToken);
      authStorage.setUser(data.user);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirish amalga oshmadi");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authStorage.clearAccessToken();
    setUser(null);
  };

  return (
    <main className="bb-page">
      <section className="bb-shell pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#121212]">Profil</h1>
          <button className="h-10 w-10 rounded-xl bg-[#F3F4F6] text-gray-600">⚙️</button>
        </div>
        {!user ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6] text-2xl">👤</div>
                <div>
                  <p className="text-sm font-semibold text-[#121212]">Siz mehmon sifatida ko'rmoqdasiz</p>
                  <p className="text-xs text-gray-500">Buyurtmalarni saqlash va tarixni ko'rish uchun kiring</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                <input className="bb-input rounded-2xl border-none bg-[#F9FAFB]" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                <button className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white" onClick={login} disabled={loading}>
                  {loading ? 'Kirilmoqda...' : "Kirish / Ro'yxatdan o'tish"}
                </button>
                <Link href="/" className="block w-full rounded-2xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600">
                  Mehmon sifatida davom etish
                </Link>
              </div>
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">Nimalardan mahrum bo'lasiz</p>
              <ul className="mt-2 space-y-2 text-xs text-gray-600">
                <li>• Buyurtmalar tarixi va saqlangan manzillar</li>
                <li>• Keyingi safar tezkor rasmiylashtirish</li>
                <li>• Qurilmalararo kuzatish</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-[#16A34A] to-[#0F8A3D] p-4 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-2xl">👤</div>
                <div>
                  <p className="font-semibold">{user.fullName}</p>
                  <p className="text-sm text-white/85">{user.email}</p>
                  <p className="mt-1 text-xs text-white/90">⭐ {normalizeRole(user.role)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/25 pt-3 text-center">
                <div>
                  <p className="text-xs text-white/80">Jami buyurtmalar</p>
                  <p className="text-lg font-bold">12</p>
                </div>
                <div>
                  <p className="text-xs text-white/80">Saqlanganlar</p>
                  <p className="text-lg font-bold">8</p>
                </div>
                <div>
                  <p className="text-xs text-white/80">Manzillar</p>
                  <p className="text-lg font-bold">3</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#121212]">Hisob</p>
              <p className="border-b border-gray-100 py-3 text-sm text-[#121212]">Buyurtmalarim</p>
              <p className="border-b border-gray-100 py-3 text-sm text-[#121212]">Manzillar</p>
              <p className="border-b border-gray-100 py-3 text-sm text-[#121212]">To'lov usullari</p>
              <p className="border-b border-gray-100 py-3 text-sm text-[#121212]">Bildirishnomalar</p>
              <p className="py-3 text-sm text-[#121212]">Yordam va qo'llab-quvvatlash</p>
            </div>
            <div className="space-y-2">
              {normalizeRole(user.role) === 'business' ? (
                <a className="block w-full rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700" href="/business">Biznes paneliga o'tish</a>
              ) : null}
              {normalizeRole(user.role) === 'admin' ? (
                <a className="block w-full rounded-2xl bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700" href="/admin">Admin paneliga o'tish</a>
              ) : null}
              {normalizeRole(user.role) === 'courier' ? (
                <a className="block w-full rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700" href="/courier">Courier paneliga o'tish</a>
              ) : null}
              {normalizeRole(user.role) === 'picker' ? (
                <a className="block w-full rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" href="/picker">Picker paneliga o'tish</a>
              ) : null}
            </div>
            <button className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700" onClick={logout}>Chiqish</button>
          </div>
        )}
      </section>
      <MobileNav />
    </main>
  );
}
