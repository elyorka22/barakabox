'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { fetchPublicSettings, type PublicSettings } from '@/lib/public-settings';
import { fetchHomepageBannerAdmin, type HomepageBanner } from '@/lib/homepage-banner';
import {
  fetchDeliveryConfig,
  invalidateDeliveryConfigCache,
  type DeliveryConfig,
} from '@/lib/delivery-pricing';
import {
  fetchSchedulingSettingsAdmin,
  updateSchedulingSettingsAdmin,
  type SchedulingSettings,
} from '@/lib/scheduled-delivery';

export default function AdminSettingsPage() {
  const token = authStorage.getAccessToken();
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportTelegramUrl, setSupportTelegramUrl] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerAmount, setBannerAmount] = useState('50000');
  const [bannerColor, setBannerColor] = useState('#F2E5CC');
  const [bannerActive, setBannerActive] = useState(true);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryPrice, setDeliveryPrice] = useState('15000');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('350000');
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(true);
  const [schedulingLoading, setSchedulingLoading] = useState(true);
  const [schedulingSaving, setSchedulingSaving] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(true);
  const [scheduleSlotMinutes, setScheduleSlotMinutes] = useState('60');
  const [scheduleWorkStartHour, setScheduleWorkStartHour] = useState('9');
  const [scheduleWorkEndHour, setScheduleWorkEndHour] = useState('21');
  const [scheduleMinDelayMinutes, setScheduleMinDelayMinutes] = useState('60');
  const [scheduleMaxOrdersPerSlot, setScheduleMaxOrdersPerSlot] = useState('20');
  const [schedulePrepLeadMinutes, setSchedulePrepLeadMinutes] = useState('30');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        await api.get('/upload/storage', token);
        setHealth({ ok: true, message: 'Server health good' });
      } catch {
        setHealth({ ok: false, message: 'Server bilan aloqa muammosi' });
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPublicSettings();
        if (cancelled) return;
        setSupportTelegramUrl(data.supportTelegramUrl ?? '');
        setSupportTitle(data.supportTitle ?? '');
      } catch {
        if (!cancelled) showToast({ type: 'error', message: 'Yordam sozlamalarini yuklab bo‘lmadi' });
      } finally {
        if (!cancelled) setSupportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!token) return;
        const data = await fetchHomepageBannerAdmin(token);
        if (cancelled || !data) return;
        setBannerTitle(data.title);
        setBannerSubtitle(data.subtitle ?? '');
        setBannerAmount(String(data.freeDeliveryAmount));
        setBannerColor(data.backgroundColor);
        setBannerActive(data.isActive);
      } catch {
        if (!cancelled) showToast({ type: 'error', message: 'Banner yuklanmadi' });
      } finally {
        if (!cancelled) setBannerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDeliveryConfig();
        if (cancelled) return;
        setDeliveryPrice(String(data.deliveryPrice));
        setFreeDeliveryThreshold(String(data.freeDeliveryThreshold));
        setFreeDeliveryEnabled(data.freeDeliveryEnabled);
      } catch {
        if (!cancelled) showToast({ type: 'error', message: 'Yetkazish sozlamalarini yuklab bo‘lmadi' });
      } finally {
        if (!cancelled) setDeliveryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!token) return;
        const data = await fetchSchedulingSettingsAdmin(token);
        if (cancelled) return;
        setSchedulingEnabled(data.scheduledOrdersEnabled ?? true);
        setScheduleSlotMinutes(String(data.slotMinutes ?? 60));
        setScheduleWorkStartHour(String(data.workStartHour ?? 9));
        setScheduleWorkEndHour(String(data.workEndHour ?? 21));
        setScheduleMinDelayMinutes(String(data.minDelayMinutes ?? 60));
        setScheduleMaxOrdersPerSlot(String(data.maxOrdersPerSlot ?? 20));
        setSchedulePrepLeadMinutes(String(data.prepLeadMinutes ?? 30));
      } catch {
        if (!cancelled) showToast({ type: 'error', message: 'Reja yetkazish sozlamalari yuklanmadi' });
      } finally {
        if (!cancelled) setSchedulingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveScheduling = async () => {
    if (!token) {
      showToast({ type: 'error', message: 'Avval tizimga kiring' });
      return;
    }
    setSchedulingSaving(true);
    try {
      await updateSchedulingSettingsAdmin(token, {
        scheduledOrdersEnabled: schedulingEnabled,
        slotMinutes: Number(scheduleSlotMinutes) === 30 ? 30 : 60,
        workStartHour: Number(scheduleWorkStartHour),
        workEndHour: Number(scheduleWorkEndHour),
        minDelayMinutes: Number(scheduleMinDelayMinutes),
        maxOrdersPerSlot: Number(scheduleMaxOrdersPerSlot),
        prepLeadMinutes: Number(schedulePrepLeadMinutes),
      });
      showToast({ type: 'success', message: 'Reja yetkazish saqlandi' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Saqlanmadi' });
    } finally {
      setSchedulingSaving(false);
    }
  };

  const saveDelivery = async () => {
    if (!token) {
      showToast({ type: 'error', message: 'Avval tizimga kiring' });
      return;
    }
    setDeliverySaving(true);
    try {
      const saved = await api.patch<DeliveryConfig>(
        '/admin/settings/delivery',
        {
          deliveryPrice: Number(deliveryPrice),
          freeDeliveryThreshold: Number(freeDeliveryThreshold),
          freeDeliveryEnabled,
        },
        token,
      );
      setDeliveryPrice(String(saved.deliveryPrice));
      setFreeDeliveryThreshold(String(saved.freeDeliveryThreshold));
      setFreeDeliveryEnabled(saved.freeDeliveryEnabled);
      invalidateDeliveryConfigCache();
      showToast({ type: 'success', message: 'Yetkazish sozlamalari saqlandi' });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Saqlashda xatolik',
      });
    } finally {
      setDeliverySaving(false);
    }
  };

  const saveBanner = async () => {
    if (!token) return;
    setBannerSaving(true);
    try {
      const saved = await api.patch<HomepageBanner>(
        '/admin/settings/homepage-banner',
        {
          title: bannerTitle.trim(),
          subtitle: bannerSubtitle.trim() || null,
          freeDeliveryAmount: Number(bannerAmount),
          backgroundColor: bannerColor,
          isActive: bannerActive,
        },
        token,
      );
      setBannerTitle(saved.title);
      setBannerSubtitle(saved.subtitle ?? '');
      setBannerAmount(String(saved.freeDeliveryAmount));
      setBannerColor(saved.backgroundColor);
      setBannerActive(saved.isActive);
      showToast({ type: 'success', message: 'Bosh sahifa banneri saqlandi' });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Saqlashda xatolik',
      });
    } finally {
      setBannerSaving(false);
    }
  };

  const saveSupport = async () => {
    if (!token) {
      showToast({ type: 'error', message: 'Avval tizimga kiring' });
      return;
    }
    setSupportSaving(true);
    try {
      const payload: Partial<PublicSettings> = {
        supportTelegramUrl: supportTelegramUrl.trim() || null,
        supportTitle: supportTitle.trim() || null,
      };
      const saved = await api.patch<PublicSettings>('/admin/settings/support', payload, token);
      setSupportTelegramUrl(saved.supportTelegramUrl ?? '');
      setSupportTitle(saved.supportTitle ?? '');
      showToast({ type: 'success', message: 'Yordam sozlamalari saqlandi' });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Saqlashda xatolik',
      });
    } finally {
      setSupportSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-slate-500">JWT/auth holati, tizim konfiguratsiyasi va health indikatorlari.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Yordam / Aloqa</h3>
        <p className="mt-1 text-xs text-slate-500">
          Profil sahifasidagi &quot;Yordam&quot; tugmasi uchun Telegram havolasi. Masalan: https://t.me/username
        </p>
        {supportLoading ? (
          <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Telegram havolasi</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://t.me/yordam"
                value={supportTelegramUrl}
                onChange={(e) => setSupportTelegramUrl(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Sarlavha (ixtiyoriy)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Yordam"
                value={supportTitle}
                onChange={(e) => setSupportTitle(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={supportSaving}
              onClick={() => void saveSupport()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {supportSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Yetkazish sozlamalari</h3>
        <p className="mt-1 text-xs text-slate-500">
          Bitta yetkazish narxi va ixtiyoriy bepul yetkazish chegarasi. Savatcha va checkout shu qoidalarga qarab
          hisoblanadi.
        </p>
        {deliveryLoading ? (
          <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Yetkazish narxi (so&apos;m)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={freeDeliveryEnabled}
                onChange={(e) => setFreeDeliveryEnabled(e.target.checked)}
              />
              <span className="font-medium text-slate-700">Bepul yetkazish qoidasini yoqish</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Bepul yetkazish chegarasi (so&apos;m)</span>
              <input
                type="number"
                min={0}
                disabled={!freeDeliveryEnabled}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={deliverySaving}
              onClick={() => void saveDelivery()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {deliverySaving ? 'Saqlanmoqda...' : 'Yetkazishni saqlash'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Reja yetkazish sozlamalari</h3>
        <p className="mt-1 text-xs text-slate-500">Ish vaqti, slotlar va buyurtma limitlari.</p>
        {schedulingLoading ? (
          <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={schedulingEnabled}
                onChange={(e) => setSchedulingEnabled(e.target.checked)}
              />
              <span className="font-medium text-slate-700">Rejalashtirilgan buyurtmalar yoqilgan</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Slot davomiyligi (daq)</span>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={scheduleSlotMinutes}
                onChange={(e) => setScheduleSlotMinutes(e.target.value)}
              >
                <option value="30">30 daqiqa</option>
                <option value="60">1 soat</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Ish boshlanishi (soat)</span>
              <input
                type="number"
                min={0}
                max={23}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={scheduleWorkStartHour}
                onChange={(e) => setScheduleWorkStartHour(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Ish tugashi (soat)</span>
              <input
                type="number"
                min={1}
                max={24}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={scheduleWorkEndHour}
                onChange={(e) => setScheduleWorkEndHour(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Minimal kechikish (daq)</span>
              <input
                type="number"
                min={15}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={scheduleMinDelayMinutes}
                onChange={(e) => setScheduleMinDelayMinutes(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Slot uchun maks. buyurtma</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={scheduleMaxOrdersPerSlot}
                onChange={(e) => setScheduleMaxOrdersPerSlot(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Yig‘ishni boshlash (daq oldin)</span>
              <input
                type="number"
                min={5}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={schedulePrepLeadMinutes}
                onChange={(e) => setSchedulePrepLeadMinutes(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={schedulingSaving}
              onClick={() => void saveScheduling()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:col-span-2"
            >
              {schedulingSaving ? 'Saqlanmoqda...' : 'Reja yetkazishni saqlash'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Bosh sahifa — bepul yetkazish banneri</h3>
        <p className="mt-1 text-xs text-slate-500">Sarlavhada {'{amount}'} — bepul yetkazish summasi.</p>
        {bannerLoading ? (
          <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} />
              <span className="font-medium text-slate-700">Faol</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Sarlavha</span>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Pastki matn</span>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Bepul yetkazish summasi</span>
              <input type="number" min={0} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bannerAmount} onChange={(e) => setBannerAmount(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Fon rangi</span>
              <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-200" />
            </label>
            <button type="button" disabled={bannerSaving} onClick={() => void saveBanner()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {bannerSaving ? 'Saqlanmoqda...' : 'Bannerni saqlash'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">System configuration</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-3 text-sm">
            <p className="font-medium">JWT/Auth</p>
            <p className="text-xs text-slate-500">Refresh flow: active</p>
            <p className="text-xs text-slate-500">Role guard: enabled</p>
          </div>
          <div className="rounded-xl border border-slate-100 p-3 text-sm">
            <p className="font-medium">Environment status</p>
            <p className={`text-xs ${health?.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {health?.message ?? 'Tekshirilmoqda...'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Theme toggle</h3>
        <div className="mt-2 inline-flex rounded-xl border border-slate-200 p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1 text-sm ${theme === 'light' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1 text-sm ${theme === 'dark' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </div>
    </div>
  );
}
