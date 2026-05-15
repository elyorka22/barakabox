'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { COURIER_ONLINE_CHANGED, readCourierOnline } from '@/lib/courier-storage';
import type { CourierOrder } from '@/lib/courier-types';
import {
  cacheCourierOrders,
  enqueuePendingAction,
  readCachedCourierOrders,
  readPendingActions,
  writePendingActions,
} from '@/lib/courier-offline';
import { playNewOrderAlert, sortOrdersByPriority } from '@/lib/courier-order-utils';
import { showToast } from '@/lib/toast';

const POLL_MS = 12_000;
const MAX_RETRIES = 2;

function filterOrdersForCourier(data: CourierOrder[]): CourierOrder[] {
  const online = readCourierOnline();
  const userId = authStorage.getUser()?.id;
  const filtered = online
    ? data
    : data.filter((o) => o.status === 'DELIVERING' && o.assignedCourierId === userId);
  return sortOrdersByPriority(filtered);
}

async function apiWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

export function useCourierLiveUpdates(onOrders: (orders: CourierOrder[]) => void, onNewReady: (order: CourierOrder) => void) {
  const onOrdersRef = useRef(onOrders);
  const onNewReadyRef = useRef(onNewReady);
  const knownReadyRef = useRef<Set<string>>(new Set());

  onOrdersRef.current = onOrders;
  onNewReadyRef.current = onNewReady;

  useEffect(() => {
    const tick = async () => {
      if (!navigator.onLine) return;
      try {
        const token = authStorage.getAccessToken();
        const data = await api.get<CourierOrder[]>('/orders/courier', token);
        const filtered = filterOrdersForCourier(data);
        for (const o of filtered) {
          if (o.status === 'READY' && !knownReadyRef.current.has(o.id)) {
            knownReadyRef.current.add(o.id);
            if (readCourierOnline()) onNewReadyRef.current(o);
          }
        }
        onOrdersRef.current(filtered);
        cacheCourierOrders(filtered);
      } catch {
        // silent poll
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    const onOnline = () => void tick();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, []);
}

export function useCourierOrders(onNewReadyOrder: (order: CourierOrder) => void) {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const popupShownRef = useRef<Set<string>>(new Set());

  const applyOrders = useCallback((list: CourierOrder[]) => {
    setOrders(list);
    cacheCourierOrders(list);
  }, []);

  const flushPendingActions = useCallback(async () => {
    const pending = readPendingActions();
    if (!pending.length || !navigator.onLine) return;
    const token = authStorage.getAccessToken();
    const remaining = [];
    for (const item of pending) {
      try {
        if (item.type === 'accept') {
          await api.patch(`/orders/${item.orderId}/start-delivery`, {}, token);
        } else if (item.type === 'complete') {
          await api.patch(`/orders/${item.orderId}/delivered`, {}, token);
        } else if (item.type === 'reject') {
          await api.patch(`/orders/${item.orderId}/reject`, { reason: item.reason }, token);
        }
      } catch {
        remaining.push(item);
      }
    }
    writePendingActions(remaining);
    if (pending.length > remaining.length) {
      showToast({ type: 'success', message: 'Kutilgan amallar yuborildi' });
    }
  }, []);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setOffline(!navigator.onLine);

      if (!navigator.onLine) {
        applyOrders(readCachedCourierOrders());
        setError('Oflayn — keshlangan buyurtmalar ko‘rsatilmoqda');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const token = authStorage.getAccessToken();
        const data = await apiWithRetry(() => api.get<CourierOrder[]>('/orders/courier', token));
        const filtered = filterOrdersForCourier(data);

        for (const o of filtered) {
          if (
            o.status === 'READY' &&
            readCourierOnline() &&
            !popupShownRef.current.has(o.id)
          ) {
            popupShownRef.current.add(o.id);
            playNewOrderAlert();
            onNewReadyOrder(o);
          }
        }

        applyOrders(filtered);
        setError('');
        await flushPendingActions();
      } catch (err) {
        const cached = readCachedCourierOrders();
        if (cached.length) applyOrders(cached);
        setError(err instanceof Error ? err.message : 'Buyurtmalarni yuklab bo‘lmadi');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyOrders, flushPendingActions, onNewReadyOrder],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const onOnlineChange = () => void loadOrders(true);
    window.addEventListener(COURIER_ONLINE_CHANGED, onOnlineChange);
    window.addEventListener('online', onOnlineChange);
    return () => {
      window.removeEventListener(COURIER_ONLINE_CHANGED, onOnlineChange);
      window.removeEventListener('online', onOnlineChange);
    };
  }, [loadOrders]);

  useCourierLiveUpdates(applyOrders, (order) => {
    if (!popupShownRef.current.has(order.id)) {
      popupShownRef.current.add(order.id);
      playNewOrderAlert();
      onNewReadyOrder(order);
    }
  });

  const optimisticRemove = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const acceptOrder = useCallback(
    async (orderId: string) => {
      optimisticRemove(orderId);
      if (!navigator.onLine) {
        enqueuePendingAction({ type: 'accept', orderId });
        showToast({ type: 'info', message: 'Onlayn bo‘lganda qabul qilinadi' });
        return;
      }
      const token = authStorage.getAccessToken();
      await apiWithRetry(() => api.patch(`/orders/${orderId}/start-delivery`, {}, token));
      showToast({ type: 'success', message: 'Buyurtma qabul qilindi' });
      await loadOrders(true);
    },
    [loadOrders],
  );

  const completeOrder = useCallback(
    async (orderId: string) => {
      optimisticRemove(orderId);
      if (!navigator.onLine) {
        enqueuePendingAction({ type: 'complete', orderId });
        showToast({ type: 'info', message: 'Onlayn bo‘lganda yakunlanadi' });
        return;
      }
      const token = authStorage.getAccessToken();
      await apiWithRetry(() => api.patch(`/orders/${orderId}/delivered`, {}, token));
      showToast({ type: 'success', message: 'Yetkazildi' });
      await loadOrders(true);
    },
    [loadOrders],
  );

  const rejectOrder = useCallback(
    async (orderId: string, reason?: string) => {
      optimisticRemove(orderId);
      if (!navigator.onLine) {
        enqueuePendingAction({ type: 'reject', orderId, reason });
        showToast({ type: 'info', message: 'Rad etish navbatga qo‘yildi' });
        return;
      }
      const token = authStorage.getAccessToken();
      await apiWithRetry(() => api.patch(`/orders/${orderId}/reject`, { reason }, token));
      showToast({ type: 'info', message: 'Buyurtma rad etildi' });
      await loadOrders(true);
    },
    [loadOrders],
  );

  return {
    orders,
    loading,
    refreshing,
    error,
    offline,
    loadOrders,
    acceptOrder,
    completeOrder,
    rejectOrder,
  };
}
