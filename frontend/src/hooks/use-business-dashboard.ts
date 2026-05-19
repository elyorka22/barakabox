'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { BusinessDashboard } from '@/types/business-dashboard';

export function useBusinessDashboard() {
  const [data, setData] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const dash = await api.get<BusinessDashboard>('/businesses/dashboard', token);
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

  return { data, loading, error, reload: load };
}
