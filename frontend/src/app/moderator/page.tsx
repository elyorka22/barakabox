'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type PendingBusiness = { id: string; displayName: string };

export default function ModeratorPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@barakabox.local');
  const [password, setPassword] = useState('password123');
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    await runAction(async () => {
      const data = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(data.accessToken);
    });
  };

  const loadPending = async () => {
    await runAction(async () => {
      const data = await api.get<PendingBusiness[]>('/businesses/pending', token);
      setBusinesses(data);
    });
  };

  const approve = async (id: string) => {
    await runAction(async () => {
      await api.patch(`/businesses/${id}/approve`, {}, token);
      const data = await api.get<PendingBusiness[]>('/businesses/pending', token);
      setBusinesses(data);
    });
  };

  return (
    <main className="bb-page">
      <section className="bb-shell max-w-5xl space-y-4 text-[#111827]">
      <DesktopNav />
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid gap-2 sm:grid-cols-4">
        <input className="rounded-xl border border-gray-200 p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-xl border border-gray-200 p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bb-btn-secondary" onClick={login} disabled={loading}>
          {loading ? 'Working...' : 'Login'}
        </button>
        <button className="bb-btn-primary" onClick={loadPending} disabled={loading || !token}>
          Load pending businesses
        </button>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      {businesses.length === 0 ? <p className="text-[#4B5563]">No pending businesses.</p> : null}
      <ul className="space-y-2">
        {businesses.map((business) => (
          <li key={business.id} className="border p-3 flex justify-between">
            <span>{business.displayName}</span>
            <button className="bb-btn-outline" onClick={() => approve(business.id)} disabled={loading}>
              Approve
            </button>
          </li>
        ))}
      </ul>
      </section>
      <MobileNav />
    </main>
  );
}
