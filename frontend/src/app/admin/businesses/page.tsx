'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { AdminCreateBusinessModal } from '@/components/admin/admin-create-business-modal';

type BusinessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';

type Business = {
  id: string;
  displayName: string;
  phone?: string | null;
  status: BusinessStatus;
  isActive: boolean;
  user: { id: string; email: string; fullName: string; staffLogin?: string | null };
};

export default function AdminBusinessesPage() {
  const token = authStorage.getAccessToken();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BusinessStatus>('ALL');
  const [selected, setSelected] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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
          (item.phone ?? '').toLowerCase().includes(q) ||
          item.user.email.toLowerCase().includes(q) ||
          item.user.fullName.toLowerCase().includes(q) ||
          (item.user.staffLogin ?? '').toLowerCase().includes(q);
        return matchStatus && matchSearch;
      }),
    [businesses, search, statusFilter],
  );

  const approve = async (id: string) => {
    await api.patch(`/businesses/${id}/approve`, {}, token);
    setSuccess('Biznes tasdiqlandi');
    await load();
  };

  const reject = async (id: string) => {
    await api.patch(`/businesses/${id}/reject`, {}, token);
    setSuccess('Biznes rad etildi');
    await load();
  };

  const deactivate = async (id: string) => {
    await api.patch(`/businesses/${id}`, { isActive: false, status: 'DISABLED' }, token);
    setSuccess('Biznes o‘chirildi');
    await load();
  };

  const createStore = async (payload: {
    name: string;
    phone: string;
    login: string;
    password: string;
    address?: string;
    description?: string;
  }) => {
    setCreating(true);
    setError('');
    try {
      await api.post('/businesses/store', payload, token);
      setSuccess('Yangi biznes yaratildi');
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yaratib bo‘lmadi');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bizneslar</h2>
            <p className="text-sm text-slate-500">Doʻkonlarni yaratish, tasdiqlash va boshqarish.</p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Yangi biznes
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Qidirish: nom, telefon, login"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | BusinessStatus)}
          >
            <option value="ALL">Barcha status</option>
            <option value="PENDING">Kutilmoqda</option>
            <option value="APPROVED">Tasdiqlangan</option>
            <option value="REJECTED">Rad etilgan</option>
            <option value="DISABLED">O‘chirilgan</option>
          </select>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
      </div>

      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        {!loading && visible.length === 0 ? <p className="text-sm text-slate-500">Ma&apos;lumot topilmadi.</p> : null}
        <div className="space-y-3">
          {visible.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {item.user.staffLogin ?? item.user.email} · {item.phone ?? '—'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{item.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.status !== 'APPROVED' ? (
                  <button
                    className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                    onClick={() => void approve(item.id)}
                  >
                    Tasdiqlash
                  </button>
                ) : null}
                {item.status !== 'REJECTED' ? (
                  <button
                    className="rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-800"
                    onClick={() => void reject(item.id)}
                  >
                    Rad etish
                  </button>
                ) : null}
                <button
                  className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => void deactivate(item.id)}
                >
                  O‘chirish
                </button>
                <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs" onClick={() => setSelected(item)}>
                  Batafsil
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
              <h3 className="text-base font-semibold">Biznes</h3>
              <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => setSelected(null)}>
                Yopish
              </button>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p>Nomi: {selected.displayName}</p>
              <p>Login: {selected.user.staffLogin ?? '—'}</p>
              <p>Email: {selected.user.email}</p>
              <p>Egasi: {selected.user.fullName}</p>
              <p>Telefon: {selected.phone ?? '—'}</p>
              <p>Status: {selected.status}</p>
              <p>Faol: {selected.isActive ? 'Ha' : 'Yo‘q'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <AdminCreateBusinessModal
        open={createOpen}
        saving={creating}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => void createStore(payload)}
      />
    </div>
  );
}
