'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, authStorage, isApiError } from '@/lib/api';
import { BusinessStoreImageUpload } from '@/components/business/business-store-image-upload';
import { BusinessImportCatalogPanel } from '@/components/business/business-import-catalog-panel';
import { STORE_TYPE_CARDS, type StoreTypeCode } from '@/lib/store-types';

type OnboardingStatus = {
  available: boolean;
  complete: boolean;
  listingCount: number;
  steps: { profile: boolean; branding: boolean; products: boolean } | null;
};

type StoreProfile = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  storeType: StoreTypeCode;
  deliveryTimeMinutes: number | null;
  listingCount: number;
};

export function BusinessOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [store, setStore] = useState<StoreProfile | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [storeType, setStoreType] = useState<StoreTypeCode>('GROCERY');
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState('30');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [status, storeRes] = await Promise.all([
        api.get<OnboardingStatus>('/businesses/panel/onboarding', token),
        api.get<{ available: boolean; store: StoreProfile | null }>(
          '/businesses/panel/store',
          token,
        ),
      ]);
      if (status.complete) {
        router.replace('/business');
        return;
      }
      if (!storeRes.available || !storeRes.store) {
        setError('Do‘kon topilmadi. Admin bilan bog‘laning.');
        return;
      }
      const s = storeRes.store;
      setStore(s);
      setName(s.name);
      setAddress(s.address ?? '');
      setPhone(s.phone ?? '');
      setDescription(s.description ?? '');
      setStoreType((s.storeType as StoreTypeCode) ?? 'GROCERY');
      setDeliveryTimeMinutes(
        s.deliveryTimeMinutes != null ? String(s.deliveryTimeMinutes) : '30',
      );
      setLogoUrl(s.logoUrl ?? '');
      setBannerUrl(s.bannerUrl ?? '');
      if (status.steps?.products) setStep(3);
      else if (status.steps?.branding) setStep(3);
      else if (status.steps?.profile) setStep(2);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    if (name.trim().length < 2 || !address.trim()) {
      setError('Nom va manzil kerak');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch<{ store: StoreProfile }>(
        '/businesses/panel/store',
        {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim() || undefined,
          description: description.trim() || undefined,
          storeType,
          deliveryTimeMinutes: Number(deliveryTimeMinutes) || 30,
        },
        token,
      );
      setStore(res.store);
      setStep(2);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    router.replace('/business?tab=catalog');
  };

  if (loading) {
    return <p className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</p>;
  }

  if (!store) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-600">{error || 'Do‘kon mavjud emas'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24">
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Yangi do‘kon
        </p>
        <h1 className="text-lg font-bold text-[#111827]">Tez sozlash</h1>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${step >= n ? 'bg-emerald-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {step === 1 ? '1. Do‘kon ma’lumoti' : step === 2 ? '2. Logo va banner' : '3. Mahsulotlar'}
        </p>
      </div>

      <div className="px-4 py-4">
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

        {step === 1 ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Do‘kon nomi *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Manzil *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Telefon</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tavsif</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Do‘kon turi</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={storeType}
                onChange={(e) => setStoreType(e.target.value as StoreTypeCode)}
              >
                {STORE_TYPE_CARDS.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Yetkazish vaqti (daq)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={deliveryTimeMinutes}
                onChange={(e) => setDeliveryTimeMinutes(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile()}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : 'Keyingi'}
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <BusinessStoreImageUpload
              kind="logo"
              label="Logo"
              currentUrl={logoUrl || null}
              onUploaded={setLogoUrl}
            />
            <BusinessStoreImageUpload
              kind="banner"
              label="Banner"
              currentUrl={bannerUrl || null}
              onUploaded={setBannerUrl}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold"
                onClick={() => setStep(1)}
              >
                Orqaga
              </button>
              <button
                type="button"
                disabled={!logoUrl}
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <BusinessImportCatalogPanel
              onImported={() => {
                void load();
              }}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold"
                onClick={() => setStep(2)}
              >
                Orqaga
              </button>
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
              >
                Panelga o‘tish
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
