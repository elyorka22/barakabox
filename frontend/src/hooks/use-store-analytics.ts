'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { StoreAnalytics, StoreAnalyticsPeriod } from '@/types/store-analytics';

export function useStoreAnalytics(period: StoreAnalyticsPeriod = 'week') {
  const [data, setData] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      const result = await api.get<StoreAnalytics>(
        `/businesses/panel/analytics?${params.toString()}`,
        token,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statistika yuklanmadi');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
