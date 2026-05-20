'use client';

import { useEffect, useState } from 'react';
import { fetchDeliveryConfig, type DeliveryConfig } from '@/lib/delivery-pricing';

export function useDeliveryConfig() {
  const [config, setConfig] = useState<DeliveryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchDeliveryConfig().then((data) => {
      if (!cancelled) {
        setConfig(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
