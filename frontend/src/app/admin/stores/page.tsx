'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { api, authStorage, isApiError } from '@/lib/api';
import { normalizeAssetUrl } from '@/lib/asset-url';
import { AdminStoreImageUpload } from '@/components/admin/stores/admin-store-image-upload';
import { SafeImage } from '@/components/safe-image';

type AdminStore = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  deliveryTimeMinutes: number | null;
  rating: number | string;
  deliveryPrice: number;
  minOrderPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

type StoreForm = {
  name: string;
  description: string;
  address: string;
  phone: string;
  deliveryTimeMinutes: string;
  rating: string;
  deliveryPrice: string;
  minOrderPrice: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
};

const emptyForm = (): StoreForm => ({
  name: '',
  description: '',
  address: '',
  phone: '',
  deliveryTimeMinutes: '',
  rating: '',
  deliveryPrice: '0',
  minOrderPrice: '0',
  isActive: true,
  isFeatured: false,
  sortOrder: '0',
});

export default function AdminStoresPage() {
  const token = authStorage.getAccessToken();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStore | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm());
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<AdminStore[]>('/admin/marketplace/stores', token);
      setStores(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Do‘konlarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (store: AdminStore) => {
    setEditing(store);
    setForm({
      name: store.name,
      description: store.description ?? '',
      address: store.address ?? '',
      phone: store.phone ?? '',
      deliveryTimeMinutes:
        store.deliveryTimeMinutes != null ? String(store.deliveryTimeMinutes) : '',
      rating: String(Number(store.rating) || 0),
      deliveryPrice: String(store.deliveryPrice),
      minOrderPrice: String(store.minOrderPrice),
      isActive: store.isActive,
      isFeatured: store.isFeatured,
      sortOrder: String(store.sortOrder),
    });
    setLogoUrl(normalizeAssetUrl(store.logoUrl ?? ''));
    setBannerUrl(normalizeAssetUrl(store.bannerUrl ?? ''));
    setDrawerOpen(true);
    setSuccess('');
    setError('');
  };

  const save = async () => {
    if (!token || !editing) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(
        `/admin/marketplace/stores/${editing.id}`,
        {
          name: form.name.trim(),
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          deliveryTimeMinutes: form.deliveryTimeMinutes
            ? Number(form.deliveryTimeMinutes)
            : undefined,
          rating: form.rating ? Number(form.rating) : undefined,
          deliveryPrice: Number(form.deliveryPrice) || 0,
          minOrderPrice: Number(form.minOrderPrice) || 0,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          sortOrder: Number(form.sortOrder) || 0,
        },
        token,
      );
      setSuccess('Saqlandi');
      setDrawerOpen(false);
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Do‘konlar</h1>
        <p className="text-sm text-slate-500">Logo, banner va vitrina ma’lumotlari</p>
      </div>

      {error && !drawerOpen ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      ) : (
        <ul className="space-y-2">
          {stores.map((store) => (
            <li
              key={store.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {store.logoUrl ? (
                  <SafeImage
                    src={normalizeAssetUrl(store.logoUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center">🏪</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{store.name}</p>
                <p className="truncate text-xs text-slate-500">/{store.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(store)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Tahrirlash"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {drawerOpen && editing ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold text-slate-900">{editing.name}</h2>
              <p className="text-xs text-slate-500">/{editing.slug}</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <AdminStoreImageUpload
                storeId={editing.id}
                kind="logo"
                label="Logo"
                currentUrl={logoUrl || null}
                onUploaded={setLogoUrl}
              />
              <AdminStoreImageUpload
                storeId={editing.id}
                kind="banner"
                label="Banner"
                currentUrl={bannerUrl || null}
                onUploaded={setBannerUrl}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nomi</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tavsif</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Yetkazish (daq)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.deliveryTimeMinutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deliveryTimeMinutes: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Reyting</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Manzil</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Telefon</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                />
                Bosh sahifada tavsiya
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Faol
              </label>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm"
                onClick={() => setDrawerOpen(false)}
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void save()}
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
