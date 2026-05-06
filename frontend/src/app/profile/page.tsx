'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: 'CLIENT' | 'BUSINESS' | 'ADMIN' | 'COURIER'; fullName: string };
};

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
      <section className="bb-shell max-w-3xl">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Profile</h1>
        {!user ? (
          <div className="mt-4 space-y-3">
            <input className="bb-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="bb-input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="bb-btn-primary w-full" onClick={login} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="bb-secondary">Name: {user.fullName}</p>
            <p className="bb-secondary">Email: {user.email}</p>
            <p className="bb-secondary">Role: {user.role}</p>
            <div className="flex flex-wrap gap-2">
              <a className="bb-btn-secondary" href="/">Home</a>
              {user.role === 'ADMIN' ? <a className="bb-btn-secondary" href="/admin">Admin panel</a> : null}
              {user.role === 'BUSINESS' ? <a className="bb-btn-secondary" href="/business">Business panel</a> : null}
              {user.role === 'COURIER' ? <a className="bb-btn-secondary" href="/courier">Courier panel</a> : null}
            </div>
            <button className="bb-btn-outline" onClick={logout}>Logout</button>
          </div>
        )}
      </section>
      <MobileNav />
    </main>
  );
}
