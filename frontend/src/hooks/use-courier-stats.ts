'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { CourierStatsResponse } from '@/lib/courier-types';

export function useCourierStats() {
  const [stats, setStats] = useState<CourierStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<CourierStatsResponse>('/orders/courier/stats', token);
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statistikani yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startShift = useCallback(async () => {
    const token = authStorage.getAccessToken();
    await api.post('/orders/courier/shift/start', {}, token);
    await load(true);
  }, [load]);

  const endShift = useCallback(async () => {
    const token = authStorage.getAccessToken();
    await api.patch('/orders/courier/shift/end', {}, token);
    await load(true);
  }, [load]);

  return { stats, loading, error, load, startShift, endShift };
}
