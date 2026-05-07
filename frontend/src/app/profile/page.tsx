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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>>({});
  const [touched, setTouched] = useState<Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', boolean>>>({});
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(authStorage.getUser() as LoginResponse['user'] | null);
  }, []);

  const validate = () => {
    const next: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (mode === 'register') {
      if (!name.trim()) next.name = 'Ismni kiriting';
    }
    if (!email.trim()) {
      next.email = 'Emailni kiriting';
    } else if (!emailRegex.test(email.trim())) {
      next.email = 'To‘g‘ri email kiriting';
    }
    if (!password) {
      next.password = 'Parolni kiriting';
    } else if (password.length < 6) {
      next.password = 'Parol kamida 6 belgidan iborat bo‘lishi kerak';
    }
    if (mode === 'register') {
      if (!confirmPassword) {
        next.confirmPassword = 'Parolni tasdiqlang';
      } else if (confirmPassword !== password) {
        next.confirmPassword = 'Parollar mos kelmadi';
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleBlur = (field: 'name' | 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    setError('');
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password });
        authStorage.setAccessToken(data.accessToken);
        authStorage.setUser(data.user);
        setUser(data.user);
      } else {
        await api.post('/auth/register', {
          email: email.trim(),
          fullName: name.trim(),
          password,
        });
        const data = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password });
        authStorage.setAccessToken(data.accessToken);
        authStorage.setUser(data.user);
        setUser(data.user);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'login'
          ? 'Kirish amalga oshmadi'
          : "Ro‘yxatdan o‘tish amalga oshmadi",
      );
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
                  <p className="text-sm font-semibold text-[#121212]">
                    {mode === 'login' ? "Hisobingizga kiring" : "Yangi akkaunt yarating"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Buyurtmalar tarixini ko‘rish va tezkor rasmiylashtirish uchun {mode === 'login' ? 'akkauntingizga kiring' : 'ro‘yxatdan o‘ting'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="inline-flex rounded-2xl bg-[#F3F4F6] p-1 text-xs font-medium">
                  <button
                    type="button"
                    className={`flex-1 rounded-2xl px-3 py-1 ${mode === 'login' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500'}`}
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                  >
                    Kirish
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-2xl px-3 py-1 ${mode === 'register' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500'}`}
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                  >
                    Ro‘yxatdan o‘tish
                  </button>
                </div>
                {mode === 'register' ? (
                  <div className="space-y-1">
                    <input
                      className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => handleBlur('name')}
                      placeholder="Ism va familiya"
                    />
                    {touched.name && fieldErrors.name ? (
                      <p className="text-xs text-red-600">{fieldErrors.name}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1">
                  <input
                    className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="Email"
                  />
                  {touched.email && fieldErrors.email ? (
                    <p className="text-xs text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <input
                    className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder="Parol"
                  />
                  {touched.password && fieldErrors.password ? (
                    <p className="text-xs text-red-600">{fieldErrors.password}</p>
                  ) : null}
                </div>
                {mode === 'register' ? (
                  <div className="space-y-1">
                    <input
                      className="bb-input rounded-2xl border-none bg-[#F9FAFB]"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="Parolni tasdiqlang"
                    />
                    {touched.confirmPassword && fieldErrors.confirmPassword ? (
                      <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Yuborilmoqda...' : mode === 'login' ? 'Kirish' : "Ro‘yxatdan o‘tish"}
                </button>
                <Link
                  href="/"
                  className="block w-full rounded-2xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600"
                >
                  Mehmon sifatida davom etish
                </Link>
                <p className="pt-1 text-center text-xs text-gray-500">
                  {mode === 'login'
                    ? "Hisobingiz yo‘qmi? "
                    : "Akkauntingiz bormi? "}
                  <button
                    type="button"
                    className="font-semibold text-[#16A34A]"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError('');
                    }}
                  >
                    {mode === 'login' ? "Ro‘yxatdan o‘ting" : 'Kirish'}
                  </button>
                </p>
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
