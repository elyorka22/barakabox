'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { phoneDigitsForApi } from '@/lib/phone-uz';
import type { OrderTrackSnapshot } from '@/lib/order-track';
import { clearActiveOrderTrack, isTrackableOrderStatus } from '@/lib/order-track';
import type { OrderStatusLite } from '@/lib/last-order-storage';
import { saveLastOrderSnapshot } from '@/lib/last-order-storage';

const POLL_MS = 8000;

function parseStatus(value: string): OrderStatusLite {
  const s = value.toUpperCase();
  if (
    s === 'NEW' ||
    s === 'PICKING' ||
    s === 'READY' ||
    s === 'DELIVERING' ||
    s === 'DELIVERED' ||
    s === 'CANCELLED'
  ) {
    return s;
  }
  return 'NEW';
}

export function useOrderTrack(orderId: string | null, phone: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<OrderTrackSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPhone = phoneDigitsForApi(phone);

  const refresh = useCallback(async () => {
    if (!orderId || !apiPhone) return;
    try {
      const data = await api.get<OrderTrackSnapshot>(
        `/orders/${encodeURIComponent(orderId)}/track?phone=${encodeURIComponent(apiPhone)}`,
      );
      const next: OrderTrackSnapshot = {
        ...data,
        status: parseStatus(data.status),
      };
      setSnapshot(next);
      setError('');
      saveLastOrderSnapshot(
        {
          id: next.id,
          status: next.status,
          createdAt: next.createdAt,
          cashbackEarnedSnapshotTiyin: next.cashbackEarnedTiyin,
          assignedCourier: next.courierName ? { fullName: next.courierName } : undefined,
        },
        [],
      );
      if (next.status === 'DELIVERED' || next.status === 'CANCELLED') {
        clearActiveOrderTrack();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holatni yuklab bo‘lmadi');
    }
  }, [orderId, apiPhone]);

  useEffect(() => {
    if (!enabled || !orderId || !apiPhone) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, orderId, apiPhone, refresh]);

  useEffect(() => {
    if (!enabled || !orderId || !apiPhone) return;
    if (snapshot && !isTrackableOrderStatus(snapshot.status)) return;
    if (snapshot?.status === 'DELIVERED') return;

    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, orderId, apiPhone, snapshot?.status, refresh]);

  return { snapshot, loading, error, refresh };
}
