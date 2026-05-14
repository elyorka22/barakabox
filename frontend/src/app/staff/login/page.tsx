'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { StoredUser } from '@/lib/api';
import { staffDashboardPath } from '@/lib/profile-role';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
};

export default function StaffLoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!login.trim() || !password) {
      setError('Login va parolni kiriting');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { login: login.trim(), password });
      authStorage.setAccessToken(data.accessToken);
      authStorage.setRefreshToken(data.refreshToken);
      authStorage.setUser(data.user);
      const dash = staffDashboardPath(data.user.role);
      if (dash) {
        window.location.href = dash;
        return;
      }
      setError('Bu akkaunt xodim paneliga biriktirilmagan');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kirish amalga oshmadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/90">Xodimlar</p>
          <h1 className="mt-1 text-2xl font-bold">Tizimga kirish</h1>
          <p className="mt-2 text-sm text-slate-300">Login va parol (mijozlar uchun emas).</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
          <label className="block text-xs font-medium text-slate-300">Login</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3.5 text-base outline-none ring-emerald-500/40 focus:ring-2"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="masalan: courier_1"
          />
          <label className="mt-4 block text-xs font-medium text-slate-300">Parol</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3.5 text-base outline-none ring-emerald-500/40 focus:ring-2"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            className="mt-5 min-h-[52px] w-full rounded-xl bg-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 active:scale-[0.99] disabled:opacity-60"
            onClick={() => void submit()}
          >
            {loading ? 'Kutilmoqda…' : 'Kirish'}
          </button>
        </div>
        <Link href="/profile" className="text-center text-sm text-slate-400 underline underline-offset-2">
          Mijoz sifatida kirish / ro‘yxatdan o‘tish
        </Link>
      </div>
    </main>
  );
}
