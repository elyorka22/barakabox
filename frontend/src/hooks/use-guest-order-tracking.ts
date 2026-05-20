'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  GUEST_TRACK_POLL_MS,
  GUEST_TRACK_POLL_HIDDEN_MS,
  type PublicOrderTrackSnapshot,
  isActiveGuestOrderStatus,
  isCompletedGuestOrderStatus,
  parsePublicTrackStatus,
} from '@/lib/order-track';
import { saveLastOrderSnapshot } from '@/lib/last-order-storage';
import {
  COMPLETED_FLASH_MS,
  clearCompletedFlash,
  finalizeGuestOrderCompletion,
  getCompletedFlash,
  getSelectedActiveGuestOrder,
  guestOrdersChangedEvent,
  listActiveGuestOrders,
  selectGuestOrder,
  type GuestCompletedFlash,
  type StoredGuestOrder,
  upsertActiveGuestOrderFromApi,
} from '@/lib/guest-order-tracking-storage';

function toStoredFromApi(data: PublicOrderTrackSnapshot): StoredGuestOrder | null {
  const status = parsePublicTrackStatus(data.status);
  return upsertActiveGuestOrderFromApi({
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
  const [completedFlash, setCompletedFlashState] = useState<GuestCompletedFlash | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const reloadLocal = useCallback(() => {
    const list = listActiveGuestOrders();
    const current = getSelectedActiveGuestOrder() ?? list[0] ?? null;
    const flash = getCompletedFlash();
    setOrders(list);
    setSelected(current);
    setCompletedFlashState(flash);
    return { list, current, flash };
  }, []);

  const refreshFromApi = useCallback(
    async (trackingToken?: string) => {
      const token = trackingToken ?? getSelectedActiveGuestOrder()?.trackingToken;
      if (!token) return null;
      try {
        const data = await api.get<PublicOrderTrackSnapshot>(
          `/orders/track/public?token=${encodeURIComponent(token)}`,
        );
        const status = parsePublicTrackStatus(data.status);

        if (isCompletedGuestOrderStatus(status)) {
          finalizeGuestOrderCompletion({
            trackingToken: data.trackingToken,
            trackingCode: data.trackingCode,
            status,
            deliverySpeed: data.deliverySpeed,
            createdAt: data.createdAt,
            updatedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString(),
            cashbackEarnedTiyin: data.cashbackEarnedTiyin,
            cashbackCredited: data.cashbackCredited,
            courierName: data.courierName ?? null,
          });
          reloadLocal();
          setError('');
          return null;
        }

        const stored = toStoredFromApi(data);
        if (stored) {
          syncProfileSnapshot(stored);
        }
        setError('');
        reloadLocal();
        return stored;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Holatni yuklab bo‘lmadi');
        return null;
      }
    },
    [reloadLocal],
  );

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
    const onStoreChange = () => reloadLocal();
    window.addEventListener(guestOrdersChangedEvent, onStoreChange);
    return () => window.removeEventListener(guestOrdersChangedEvent, onStoreChange);
  }, [reloadLocal]);

  useEffect(() => {
    if (!pollEnabled || !hydrated) return;
    const current = getSelectedActiveGuestOrder();
    if (!current || !isActiveGuestOrderStatus(current.status)) return;

    const tick = () => {
      setSyncing(true);
      void refreshFromApi(current.trackingToken).finally(() => setSyncing(false));
    };

    const schedule = () => {
      const ms = typeof document !== 'undefined' && document.hidden
        ? GUEST_TRACK_POLL_HIDDEN_MS
        : GUEST_TRACK_POLL_MS;
      return window.setInterval(tick, ms);
    };
    let id = schedule();
    const onVisibility = () => {
      window.clearInterval(id);
      id = schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollEnabled, hydrated, selected?.trackingToken, selected?.status, refreshFromApi]);

  useEffect(() => {
    if (!completedFlash) return;
    const remaining = COMPLETED_FLASH_MS - (Date.now() - Date.parse(completedFlash.completedAt));
    const delay = Math.max(0, remaining);
    const id = window.setTimeout(() => {
      clearCompletedFlash();
      reloadLocal();
    }, delay);
    return () => window.clearTimeout(id);
  }, [completedFlash, reloadLocal]);

  const registerNewOrder = useCallback(
    (data: PublicOrderTrackSnapshot) => {
      clearCompletedFlash();
      const stored = toStoredFromApi(data);
      if (stored) {
        selectGuestOrder(stored.trackingToken);
        syncProfileSnapshot(stored);
      }
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

  const dismissCompletedFlash = useCallback(() => {
    clearCompletedFlash();
    reloadLocal();
  }, [reloadLocal]);

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
  const showCompletedFlash = hydrated && Boolean(completedFlash) && !showTracking;

  return {
    hydrated,
    orders,
    selected,
    snapshot: snapshotForUi,
    showTracking,
    showCompletedFlash,
    completedFlash,
    loading,
    syncing,
    error,
    refresh: refreshFromApi,
    registerNewOrder,
    pickOrder,
    dismissCompletedFlash,
  };
}
