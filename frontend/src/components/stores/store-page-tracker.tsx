'use client';

import { useEffect } from 'react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

type Props = {
  storeId: string;
  storeSlug: string;
  storeName: string;
};

export function StorePageTracker({ storeId, storeSlug, storeName }: Props) {
  useEffect(() => {
    void import('@/lib/analytics/client').then((m) =>
      m.trackAnalytics(ANALYTICS_EVENTS.STORE_VIEWED, {
        storeId,
        storeSlug,
        storeName,
      }),
    );
  }, [storeId, storeSlug, storeName]);

  return null;
}
