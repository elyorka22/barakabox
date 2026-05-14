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
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold md:text-xl">Mijozlar (telefon)</h1>
        <p className="text-xs text-slate-600 md:text-sm">Keshbek va buyurtmalar telefon bo‘yicha yig‘iladi.</p>
      </div>
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-red-700">{error}</p> : null}

      <div className="md:hidden">
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-mono text-sm font-semibold text-slate-900">{c.phone}</p>
              <p className="mt-0.5 text-sm text-slate-700">{c.name ?? '—'}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Keshbek</p>
                  <p className="font-medium">{formatMoneyUz(c.cashbackBalance)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Sarflangan</p>
                  <p className="font-medium">{formatMoneyUz(c.totalSpent)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Buyurtmalar</p>
                  <p className="font-medium">{c.totalOrders}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
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
