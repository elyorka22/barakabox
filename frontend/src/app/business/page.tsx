'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

export default function BusinessPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('business@barakabox.local');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('New Product');
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
    });
  };

  const registerBusiness = async () => {
    await runAction(async () => {
      await api.post('/businesses/register', { displayName: 'Baraka Fresh Store' }, token);
      setMessage('Business profile submitted');
    });
  };

  const createProduct = async () => {
    await runAction(async () => {
      await api.post('/products', { name, price: 2.5, stock: 50 }, token);
      setMessage('Product created');
    });
  };

  const loadOrders = async () => {
    await runAction(async () => {
      const data = await api.get('/orders', token);
      setMessage(JSON.stringify(data));
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button className="bb-btn-secondary" onClick={registerBusiness} disabled={loading || !token}>
          Register business
        </button>
        <input className="rounded-xl border border-gray-200 p-2" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="bb-btn-secondary" onClick={createProduct} disabled={loading || !token}>
          Create product
        </button>
        <button className="bb-btn-primary" onClick={loadOrders} disabled={loading || !token}>
          Load orders
        </button>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      <pre className="bg-gray-100 p-3 text-xs text-[#374151] overflow-auto">{message}</pre>
      </section>
      <MobileNav />
    </main>
  );
}
