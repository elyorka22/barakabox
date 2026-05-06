'use client';

import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

export default function AdminPage() {
  const [stats, setStats] = useState<{ totalOrders: number; totalRevenue: number; todayOrders: number } | null>(null);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<{ totalOrders: number; totalRevenue: number; todayOrders: number }>(
        '/admin/stats',
        token,
      );
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell max-w-4xl">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <button className="bb-btn-primary mt-4" onClick={loadStats}>Load stats</button>
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}
        {stats ? <pre className="mt-3 rounded bg-gray-100 p-3 text-sm">{JSON.stringify(stats, null, 2)}</pre> : null}
      </section>
      <MobileNav />
    </main>
  );
}
