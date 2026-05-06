'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  stock: number;
  isActive: boolean;
  category?: { id: string; name: string } | null;
};
type BusinessStats = {
  totalProducts: number;
  activeProducts: number;
  totalStock: number;
  soldUnits: number;
  totalRevenue: number;
  completedOrders: number;
};

export default function BusinessPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('business@barakabox.local');
  const [password, setPassword] = useState('password123');
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [message, setMessage] = useState('');
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
      setMessage('Logged in');
      await loadMyProducts(data.accessToken);
      await loadMyStats(data.accessToken);
    });
  };

  const loadMyProducts = async (activeToken?: string) => {
    const data = await api.get<Product[]>('/products/me', activeToken ?? token);
    setProducts(data);
  };

  const loadMyStats = async (activeToken?: string) => {
    const data = await api.get<BusinessStats>('/businesses/my-stats', activeToken ?? token);
    setStats(data);
  };

  const registerBusiness = async () => {
    await runAction(async () => {
      await api.post('/businesses/register', { displayName: 'Baraka Fresh Store' }, token);
      setMessage('Business profile submitted');
    });
  };

  return (
    <main className="bb-page">
      <section className="bb-shell space-y-4 text-[#111827]">
      <DesktopNav />
      <h1 className="text-2xl font-bold">Business</h1>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="rounded-xl border border-gray-200 p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-xl border border-gray-200 p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bb-btn-secondary" onClick={login} disabled={loading}>
          {loading ? 'Working...' : 'Login'}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button className="bb-btn-secondary" onClick={registerBusiness} disabled={loading || !token}>
          Register business
        </button>
        <button className="bb-btn-primary" onClick={() => void runAction(async () => loadMyStats())} disabled={loading || !token}>
          Load my stats
        </button>
        <button className="bb-btn-secondary" onClick={() => void runAction(async () => loadMyProducts())} disabled={loading || !token}>
          My products
        </button>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      {stats ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total products</p>
            <p className="text-xl font-bold">{stats.totalProducts}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Active products</p>
            <p className="text-xl font-bold">{stats.activeProducts}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total stock</p>
            <p className="text-xl font-bold">{stats.totalStock}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Sold units</p>
            <p className="text-xl font-bold">{stats.soldUnits}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Completed orders</p>
            <p className="text-xl font-bold">{stats.completedOrders}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-xl font-bold">{formatMoneyUz(stats.totalRevenue)}</p>
          </div>
        </div>
      ) : null}
      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <h2 className="text-lg font-semibold">My products (read-only)</h2>
        {products.length === 0 ? <p className="text-sm text-gray-500">No products yet.</p> : null}
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
            <div>
              <p className="font-semibold">{product.name}</p>
              {product.description ? <p className="text-xs text-gray-500">{product.description}</p> : null}
              <p className="text-xs text-gray-500">
                {formatMoneyUz(product.price)} · stock {product.stock} · {product.category?.name ?? 'No category'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <pre className="bg-gray-100 p-3 text-xs text-[#374151] overflow-auto">{message}</pre>
      </section>
      <MobileNav />
    </main>
  );
}
