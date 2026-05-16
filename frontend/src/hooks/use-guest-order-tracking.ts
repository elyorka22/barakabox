'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  GUEST_TRACK_POLL_MS,
  type PublicOrderTrackSnapshot,
  isTrackableOrderStatus,
  parsePublicTrackStatus,
} from '@/lib/order-track';
import type { OrderStatusLite } from '@/lib/last-order-storage';
import { saveLastOrderSnapshot } from '@/lib/last-order-storage';
import {
  getSelectedGuestOrder,
  guestOrdersChangedEvent,
  listVisibleGuestOrders,
  pruneGuestOrderStore,
  removeGuestOrder,
  selectGuestOrder,
  type StoredGuestOrder,
  upsertGuestOrderFromApi,
} from '@/lib/guest-order-tracking-storage';

function toStoredFromApi(data: PublicOrderTrackSnapshot): StoredGuestOrder {
  const status = parsePublicTrackStatus(data.status);
  return upsertGuestOrderFromApi({
    trackingToken: data.trackingToken,
    trackingCode: data.trackingCode,
    status,
    deliverySpeed: data.deliverySpeed,
    createdAt: data.createdAt,
    cashbackEarnedTiyin: data.cashbackEarnedTiyin,
    cashbackCredited: data.cashbackCredited,
    courierName: data.courierName,
  });
}

function syncProfileSnapshot(order: StoredGuestOrder) {
  saveLastOrderSnapshot(
    {
      id: order.trackingToken,
      status: order.status,
      createdAt: order.createdAt,
      cashbackEarnedSnapshotTiyin: order.cashbackEarnedTiyin,
      assignedCourier: order.courierName ? { fullName: order.courierName } : undefined,
    },
    [],
  );
}

export function useGuestOrderTracking(options?: { pollEnabled?: boolean }) {
  const pollEnabled = options?.pollEnabled !== false;
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<StoredGuestOrder[]>([]);
  const [selected, setSelected] = useState<StoredGuestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const reloadLocal = useCallback(() => {
    const list = listVisibleGuestOrders();
    const current = getSelectedGuestOrder() ?? list[0] ?? null;
    setOrders(list);
    setSelected(current);
    return { list, current };
  }, []);

  const refreshFromApi = useCallback(async (trackingToken?: string) => {
    const token = trackingToken ?? getSelectedGuestOrder()?.trackingToken;
    if (!token) return null;
    try {
      const data = await api.get<PublicOrderTrackSnapshot>(
        `/orders/track/public?token=${encodeURIComponent(token)}`,
      );
      const stored = toStoredFromApi(data);
      syncProfileSnapshot(stored);
      setError('');
      if (stored.status === 'DELIVERED' || stored.status === 'CANCELLED') {
        if (stored.status === 'CANCELLED') {
          removeGuestOrder(stored.trackingToken);
        }
      }
      reloadLocal();
      return stored;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holatni yuklab bo‘lmadi');
      return null;
    }
  }, [reloadLocal]);

  useEffect(() => {
    const { list, current } = reloadLocal();
    setHydrated(true);
    setLoading(list.length > 0);
    if (!current) {
      setLoading(false);
      return;
    }
    void (async () => {
      await refreshFromApi(current.trackingToken);
      setLoading(false);
    })();
  }, [reloadLocal, refreshFromApi]);

  useEffect(() => {
    const onStoreChange = () => {
      reloadLocal();
    };
    window.addEventListener(guestOrdersChangedEvent, onStoreChange);
    return () => window.removeEventListener(guestOrdersChangedEvent, onStoreChange);
  }, [reloadLocal]);

  useEffect(() => {
    if (!pollEnabled || !hydrated) return;
    const current = getSelectedGuestOrder();
    if (!current) return;
    if (!isTrackableOrderStatus(current.status)) return;

    const tick = () => {
      setSyncing(true);
      void refreshFromApi(current.trackingToken).finally(() => setSyncing(false));
    };

    const id = window.setInterval(tick, GUEST_TRACK_POLL_MS);
    return () => window.clearInterval(id);
  }, [pollEnabled, hydrated, selected?.trackingToken, selected?.status, refreshFromApi]);

  const registerNewOrder = useCallback(
    (data: PublicOrderTrackSnapshot) => {
      const stored = toStoredFromApi(data);
      selectGuestOrder(stored.trackingToken);
      syncProfileSnapshot(stored);
      reloadLocal();
      return stored;
    },
    [reloadLocal],
  );

  const pickOrder = useCallback(
    (trackingToken: string) => {
      selectGuestOrder(trackingToken);
      reloadLocal();
      void refreshFromApi(trackingToken);
    },
    [reloadLocal, refreshFromApi],
  );

  const snapshotForUi: PublicOrderTrackSnapshot | null = selected
    ? {
        trackingToken: selected.trackingToken,
        trackingCode: selected.trackingCode,
        status: selected.status,
        createdAt: selected.createdAt,
        deliverySpeed: selected.deliverySpeed,
        cashbackEarnedTiyin: selected.cashbackEarnedTiyin,
        cashbackCredited: selected.cashbackCredited,
        courierName: selected.courierName,
      }
    : null;

  const showTracking = hydrated && orders.length > 0;
  const isTerminal = selected?.status === 'DELIVERED' || selected?.status === 'CANCELLED';

  return {
    hydrated,
    orders,
    selected,
    snapshot: snapshotForUi,
    showTracking,
    isTerminal,
    loading,
    syncing,
    error,
    refresh: refreshFromApi,
    registerNewOrder,
    pickOrder,
  };
}
