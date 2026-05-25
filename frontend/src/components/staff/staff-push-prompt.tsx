'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  fetchVapidPublicKey,
  getStaffPushSupport,
  readStaffPushPref,
  subscribeStaffPush,
  unsubscribeStaffPush,
} from '@/lib/staff-push';
import { showToast } from '@/lib/toast';

type Props = {
  /** Where notification tap opens (admin uses /admin/orders). */
  context?: 'picker' | 'admin';
  className?: string;
};

export function StaffPushPrompt({ context = 'picker', className = '' }: Props) {
  const [supported, setSupported] = useState(false);
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
      setServerEnabled(vapid.enabled && Boolean(vapid.publicKey));
    } catch {
      setServerEnabled(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    setBusy(true);
    try {
      const result = await subscribeStaffPush();
      if (!result.ok) {
        if (result.reason === 'denied') {
          showToast({ type: 'error', message: 'Bildirishnomaga ruxsat berilmadi' });
        } else if (result.reason === 'server_disabled') {
          showToast({ type: 'info', message: 'Serverda push hali yoqilmagan' });
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
      showToast({
        type: 'error',
        message: e instanceof Error ? e.message : 'Xatolik',
      });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeStaffPush();
      showToast({ type: 'info', message: 'Bildirishnomalar o‘chirildi' });
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return (
      <div className={`rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 ${className}`}>
        Brauzer push bildirishnomalarni qo‘llab-quvvatlamaydi. Yangi buyurtmalarni ochiq panel orqali kuzating.
      </div>
    );
  }

  if (!serverEnabled) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 ${className}`}>
        Push serverda hali sozlanmagan (VAPID). Admin polling va ovoz signalidan foydalaning.
      </div>
    );
  }

  const hint =
    context === 'admin'
      ? 'PWA yopiq bo‘lsa ham yangi buyurtmalar haqida xabar olasiz.'
      : 'Ilova yopiq bo‘lsa ham yangi buyurtmalar haqida xabar olasiz.';

  return (
    <div className={`rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
          {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#111827]">Buyurtma bildirishnomalari</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">{hint}</p>
          {permission === 'denied' ? (
            <p className="mt-2 text-xs text-rose-600">
              Ruxsat bloklangan. Brauzer sozlamalaridan bildirishnomalarni yoqing.
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        {subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disable()}
            className="w-full rounded-xl border border-[#E5E7EB] bg-white py-2.5 text-sm font-semibold text-[#374151] disabled:opacity-50"
          >
            O‘chirish
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || permission === 'denied'}
            onClick={() => void enable()}
            className="w-full rounded-xl bg-[#16A34A] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Ulanmoqda…' : 'Yoqish'}
          </button>
        )}
      </div>
    </div>
  );
}
