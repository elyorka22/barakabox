'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import {
  fetchVapidPublicKey,
  getStaffPushSupport,
  readStaffPushPref,
  subscribeStaffPush,
  unsubscribeStaffPush,
} from '@/lib/staff-push';
import { showToast } from '@/lib/toast';

type Props = {
  context?: 'picker' | 'admin';
  className?: string;
  /** Compact row for admin dashboard header area. */
  variant?: 'card' | 'panel';
};

export function StaffPushPrompt({ context = 'picker', className = '', variant = 'card' }: Props) {
  const [supported, setSupported] = useState(true);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = getStaffPushSupport();
    setSupported(s.supported);
    setPermission(s.permission);
    setSubscribed(readStaffPushPref());
    try {
      const vapid = await fetchVapidPublicKey();
      setServerEnabled(Boolean(vapid.publicKey) && vapid.enabled);
    } catch {
      setServerEnabled(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canEnable = supported && serverEnabled && permission !== 'denied';
  const toggleDisabled = busy || !canEnable;

  const onToggle = async (next: boolean) => {
    if (next) {
      if (!supported) {
        showToast({ type: 'info', message: 'Brauzer pushni qo‘llab-quvvatlamaydi' });
        return;
      }
      if (!serverEnabled) {
        showToast({ type: 'info', message: 'Serverda VAPID kalitlari yoqilmagan (backend .env)' });
        return;
      }
      setBusy(true);
      try {
        const result = await subscribeStaffPush();
        if (!result.ok) {
          if (result.reason === 'denied') {
            showToast({ type: 'error', message: 'Bildirishnomaga ruxsat berilmadi' });
          } else {
            showToast({ type: 'error', message: 'Push yoqib bo‘lmadi' });
          }
          await refresh();
          return;
        }
        showToast({ type: 'success', message: 'Buyurtma bildirishnomalari yoqildi' });
        setSubscribed(true);
        setPermission('granted');
      } catch (e) {
        showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      await unsubscribeStaffPush();
      showToast({ type: 'info', message: 'Bildirishnomalar o‘chirildi' });
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  const statusNote = !supported
    ? 'Brauzer pushni qo‘llab-quvvatlamaydi.'
    : !serverEnabled
      ? 'Serverda VAPID yo‘q — docker-compose/backend konteyneriga VAPID_* o‘zgaruvchilari uzatilmagan yoki backend qayta ishga tushirilmagan.'
      : permission === 'denied'
        ? 'Ruxsat bloklangan — brauzer sozlamalaridan yoqing.'
        : subscribed
          ? 'Yangi buyurtmalar haqida push olasiz (PWA yopiq bo‘lsa ham).'
          : 'Yoqish uchun tugmani yoqing va ruxsat bering.';

  const shellClass =
    variant === 'panel'
      ? `rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm ${className}`
      : `rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 ${className}`;

  return (
    <div className={shellClass}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            subscribed ? 'bg-[#16A34A] text-white' : 'bg-[#111827] text-white'
          }`}
        >
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#111827]">Buyurtma push bildirishnomalari</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">{statusNote}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={subscribed}
          aria-label={subscribed ? 'Push yoqilgan' : 'Push o‘chirilgan'}
          disabled={toggleDisabled}
          onClick={() => void onToggle(!subscribed)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
            subscribed ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
              subscribed ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {context === 'admin' && variant === 'panel' ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Batafsil:{' '}
          <Link href="/admin/notifications" className="font-medium text-emerald-700 underline">
            Push sozlamalari
          </Link>
        </p>
      ) : null}

      {!subscribed && canEnable ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onToggle(true)}
          className="mt-3 w-full rounded-xl bg-[#16A34A] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Ulanmoqda…' : 'Ruxsat so‘rash va yoqish'}
        </button>
      ) : null}
    </div>
  );
}
