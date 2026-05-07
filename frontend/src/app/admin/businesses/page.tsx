'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';

type Business = {
  id: string;
  displayName: string;
  phone?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  user: { id: string; email: string; fullName: string };
};

export default function AdminBusinessesPage() {
  const token = authStorage.getAccessToken();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Business['status']>('ALL');
  const [selected, setSelected] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Business[]>('/businesses', token);
      setBusinesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bizneslarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  const visible = useMemo(
    () =>
      businesses.filter((item) => {
        const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
        const q = search.trim().toLowerCase();
        const matchSearch =
          q.length === 0 ||
          item.displayName.toLowerCase().includes(q) ||
          item.user.email.toLowerCase().includes(q) ||
          item.user.fullName.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      }),
    [businesses, search, statusFilter],
  );

  const approve = async (id: string) => {
    await api.patch(`/businesses/${id}/approve`, {}, token);
    await load();
  };

  const deactivate = async (id: string) => {
    await api.patch(`/businesses/${id}`, { isActive: false }, token);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Business management</h2>
        <p className="text-sm text-slate-500">Qidiruv, status filtri va approve/reject amallari.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Qidirish: nom, email, owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | Business['status'])}
          >
            <option value="ALL">Barcha status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        {!loading && visible.length === 0 ? <p className="text-sm text-slate-500">Ma'lumot topilmadi.</p> : null}
        <div className="space-y-3">
          {visible.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.displayName}</p>
                  <p className="text-xs text-slate-500">{item.user.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{item.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700" onClick={() => void approve(item.id)}>
                  Approve
                </button>
                <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void deactivate(item.id)}>
                  Reject/Deactivate
                </button>
                <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs" onClick={() => setSelected(item)}>
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Business detail</h3>
              <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => setSelected(null)}>
                Yopish
              </button>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p>Nomi: {selected.displayName}</p>
              <p>Email: {selected.user.email}</p>
              <p>Owner: {selected.user.fullName}</p>
              <p>Telefon: {selected.phone ?? '-'}</p>
              <p>Status: {selected.status}</p>
              <p>Active: {selected.isActive ? 'Ha' : "Yo'q"}</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
