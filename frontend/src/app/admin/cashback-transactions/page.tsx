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
    <div className="space-y-3">
      <h1 className="text-lg font-semibold md:text-xl">Keshbek tranzaksiyalari</h1>
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-red-700">{error}</p> : null}

      <div className="md:hidden">
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs text-slate-600">{r.customer.phone}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  {r.status}
                </span>
              </div>
              {r.customer.name ? <p className="mt-0.5 text-sm text-slate-800">{r.customer.name}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString('uz-UZ')}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-slate-500">Tur: </span>
                  <span className="font-medium">{r.type}</span>
                </span>
                <span className="font-semibold text-emerald-800">{formatMoneyUz(r.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Buyurtma: <span className="font-mono">{r.order?.id ?? '—'}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bb-scrollbar-hide hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
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
