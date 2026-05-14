'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type Customer = {
  id: string;
  phone: string;
  name: string | null;
  cashbackBalance: number;
  totalSpent: number;
  totalOrders: number;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const token = authStorage.getAccessToken();
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await api.get<Customer[]>('/admin/customers', token);
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yuklanmadi');
      }
    })();
  }, [token]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mijozlar (telefon)</h1>
      <p className="text-sm text-slate-600">Keshbek va buyurtmalar telefon bo‘yicha yig‘iladi.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Ism</th>
              <th className="px-3 py-2">Keshbek</th>
              <th className="px-3 py-2">Jami sarflangan</th>
              <th className="px-3 py-2">Buyurtmalar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">{c.phone}</td>
                <td className="px-3 py-2">{c.name ?? '—'}</td>
                <td className="px-3 py-2">{formatMoneyUz(c.cashbackBalance)}</td>
                <td className="px-3 py-2">{formatMoneyUz(c.totalSpent)}</td>
                <td className="px-3 py-2">{c.totalOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
