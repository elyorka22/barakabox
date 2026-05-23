'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { StorePanelDashboard } from '@/types/store-panel';

export function useStorePanelDashboard() {
  const [data, setData] = useState<StorePanelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const dash = await api.get<StorePanelDashboard>('/businesses/panel/dashboard', token);
      setData(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Maʼlumot yuklanmadi');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load, hasMarketplace: Boolean(data?.marketplace) };
}
