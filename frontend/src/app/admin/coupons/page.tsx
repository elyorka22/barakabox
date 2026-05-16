'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  expiresAt: string | null;
  isActive: boolean;
  notes: string | null;
};

type FormState = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  expiresAt: string;
  isActive: boolean;
  notes: string;
};

const emptyForm = (): FormState => ({
  id: '',
  code: '',
  discountType: 'PERCENT',
  discountValue: '10',
  minOrderAmount: '0',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  expiresAt: '',
  isActive: true,
  notes: '',
});

function discountLabel(c: Coupon) {
  if (c.discountType === 'PERCENT') {
    return `${c.discountValue}%${c.maxDiscount ? ` (maks. ${formatMoneyUz(c.maxDiscount)})` : ''}`;
  }
  return formatMoneyUz(c.discountValue);
}

export default function AdminCouponsPage() {
  const token = authStorage.getAccessToken();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Coupon[]>('/coupons', token);
      setCoupons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kuponlarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setForm({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      perUserLimit: String(c.perUserLimit),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '',
      isActive: c.isActive,
      notes: c.notes ?? '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    const payload = {
      code: form.code.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscount: form.maxDiscount.trim() ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : undefined,
      perUserLimit: Number(form.perUserLimit) || 1,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      isActive: form.isActive,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (form.id) {
        await api.patch(`/coupons/${form.id}`, payload, token);
      } else {
        await api.post('/coupons', payload, token);
      }
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    if (!token) return;
    try {
      await api.patch(`/coupons/${c.id}`, { isActive: !c.isActive }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holatni o‘zgartirib bo‘lmadi');
    }
  };

  const confirmDelete = async () => {
    if (!token || !deleteId) return;
    try {
      await api.delete(`/coupons/${deleteId}`, {}, token);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirib bo‘lmadi');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Kuponlar</h2>
          <p className="text-sm text-slate-500">Promo-kodlarni boshqaring</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yangi kupon
        </button>
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">{form.id ? 'Kuponni tahrirlash' : 'Yangi kupon'}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Kupon kodi
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Chegirma turi
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.discountType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discountType: e.target.value as 'PERCENT' | 'FIXED_AMOUNT' }))
                }
              >
                <option value="PERCENT">Foiz (%)</option>
                <option value="FIXED_AMOUNT">Fikslangan summa</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Qiymat
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.discountValue}
                onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Minimal buyurtma
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.minOrderAmount}
                onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Maks. chegirma (foiz uchun)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.maxDiscount}
                onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Umumiy limit
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Cheksiz"
                value={form.usageLimit}
                onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Foydalanuvchi limiti
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.perUserLimit}
                onChange={(e) => setForm((p) => ({ ...p, perUserLimit: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Muddati
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Faol
            </label>
            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
              Izoh
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Saqlash
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
              }}
            >
              Bekor
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Kuponlar yo‘q</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {coupons.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
              return (
                <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-bold text-[#0f172a]">{c.code}</p>
                    <p className="text-sm text-slate-600">Chegirma: {discountLabel(c)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ishlatilgan: {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ''} · Min: {formatMoneyUz(c.minOrderAmount)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        !c.isActive
                          ? 'bg-slate-100 text-slate-600'
                          : expired
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {!c.isActive ? 'Nofaol' : expired ? 'Muddati tugagan' : 'Faol'}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
                      onClick={() => void toggleActive(c)}
                    >
                      {c.isActive ? 'O‘chirish' : 'Yoqish'}
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                      onClick={() => openEdit(c)}
                      aria-label="Tahrirlash"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600"
                      onClick={() => setDeleteId(c.id)}
                      aria-label="O‘chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold">Kuponni o‘chirish?</h3>
            <p className="mt-2 text-sm text-slate-600">Bu amalni qaytarib bo‘lmaydi.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 min-h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white"
                onClick={() => void confirmDelete()}
              >
                O‘chirish
              </button>
              <button
                type="button"
                className="flex-1 min-h-11 rounded-xl border border-slate-200 text-sm font-medium"
                onClick={() => setDeleteId(null)}
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
