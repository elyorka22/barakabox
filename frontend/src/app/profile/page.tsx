'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';

type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: string; fullName: string };
};

function normalizeRole(role?: string): 'user' | 'business' | 'admin' {
  if (!role) return 'user';
  const normalized = role.toLowerCase();
  if (normalized === 'business') return 'business';
  if (normalized === 'admin') return 'admin';
  return 'user';
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
      setError(err instanceof Error ? err.message : 'Login failed');
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
        <h1 className="text-2xl font-bold text-[#121212]">Profile</h1>
        {!user ? (
          <div className="mt-4 space-y-3">
            <input className="bb-input rounded-2xl border-none bg-white" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="bb-input rounded-2xl border-none bg-white" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white" onClick={login} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-lg">👤</div>
                <div>
                  <p className="font-semibold text-[#121212]">{user.fullName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="border-b border-gray-100 py-2 text-sm text-[#121212]">Orders</p>
              <p className="border-b border-gray-100 py-2 text-sm text-[#121212]">Addresses</p>
              <p className="py-2 text-sm text-[#121212]">Payment methods</p>
            </div>
            {normalizeRole(user.role) === 'business' ? (
              <a className="block w-full rounded-2xl bg-[#16A34A] px-4 py-3 text-center text-sm font-semibold text-white" href="/business">Go to Business Panel</a>
            ) : null}
            {normalizeRole(user.role) === 'admin' ? (
              <a className="block w-full rounded-2xl bg-[#121212] px-4 py-3 text-center text-sm font-semibold text-white" href="/admin">Go to Admin Panel</a>
            ) : null}
            <button className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700" onClick={logout}>Logout</button>
          </div>
        )}
      </section>
      <MobileNav />
    </main>
  );
}
