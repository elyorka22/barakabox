'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics/consent';
import { startAnalyticsRuntime, trackPageView } from '@/lib/analytics/client';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getAnalyticsConsent() === 'pending');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_8px_32px_rgba(15,23,42,0.14)]">
        <p className="text-sm leading-snug text-[#374151]">
          Sayt tajribasini yaxshilash uchun anonim statistika va xatoliklarni kuzatamiz. Shaxsiy
          ma&apos;lumotlaringiz yashiriladi.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
            onClick={() => {
              setAnalyticsConsent('denied');
              setVisible(false);
            }}
          >
            Rad etish
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-[#3d9e72] px-3 py-2 text-sm font-semibold text-white shadow-sm"
            onClick={() => {
              setAnalyticsConsent('granted');
              setVisible(false);
              startAnalyticsRuntime();
              trackPageView();
            }}
          >
            Qabul qilish
          </button>
        </div>
      </div>
    </div>
  );
}
