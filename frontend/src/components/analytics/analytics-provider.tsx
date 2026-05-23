'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { startAnalyticsRuntime, trackPageView } from '@/lib/analytics/client';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    startAnalyticsRuntime();

    const onError = (event: ErrorEvent) => {
      void import('@/lib/analytics/client').then((m) =>
        m.trackAnalytics('frontend_error', {
          message: event.message?.slice(0, 200),
          source: event.filename,
        }),
      );
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      void import('@/lib/analytics/client').then((m) =>
        m.trackAnalytics('frontend_error', { message: reason.slice(0, 200), type: 'unhandledrejection' }),
      );
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    trackPageView(path);
  }, [pathname, searchParams]);

  return children;
}
