'use client';

import { useEffect } from 'react';
import { StaffPushPrompt } from '@/components/staff/staff-push-prompt';
import { ensureStaffPushSubscription } from '@/lib/staff-push';

export default function AdminNotificationsPage() {
  useEffect(() => {
    void ensureStaffPushSubscription();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">Push bildirishnomalar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Yangi buyurtmalar haqida xabar — ilova yopiq bo‘lsa ham (PWA + ruxsat kerak).
        </p>
      </div>
      <StaffPushPrompt context="admin" variant="panel" />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">iPhone / iPad</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-600">
          <li>Safari → «Ulashish» → «Ekranga qo‘shish».</li>
          <li>PWA ni oching va shu yerda «Yoqish» ni bosing.</li>
          <li>iOS 16.4+ va ruxsat talab qilinadi.</li>
        </ol>
      </div>
    </div>
  );
};
