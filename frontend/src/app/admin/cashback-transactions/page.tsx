'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type Row = {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  customer: { phone: string; name: string | null };
  order: { id: string; status: string } | null;
};

export default function AdminCashbackTransactionsPage() {
  const token = authStorage.getAccessToken();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await api.get<Row[]>('/admin/cashback-transactions', token);
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yuklanmadi');
      }
    })();
  }, [token]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Keshbek tranzaksiyalari</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Vaqt</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Tur</th>
              <th className="px-3 py-2">Summa</th>
              <th className="px-3 py-2">Buyurtma</th>
              <th className="px-3 py-2">Holat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.createdAt).toLocaleString('uz-UZ')}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.customer.phone}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{formatMoneyUz(r.amount)}</td>
                <td className="px-3 py-2 text-xs">{r.order?.id ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
