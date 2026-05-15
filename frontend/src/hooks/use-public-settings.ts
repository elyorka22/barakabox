'use client';

import { useEffect, useState } from 'react';
import {
  emptyPublicSettings,
  fetchPublicSettings,
  type PublicSettings,
} from '@/lib/public-settings';

export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(emptyPublicSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPublicSettings();
        if (!cancelled) setSettings(data);
      } catch {
        if (!cancelled) setSettings(emptyPublicSettings());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}
