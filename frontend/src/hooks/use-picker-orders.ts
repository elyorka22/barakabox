'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import {
  PICKER_ONLINE_CHANGED,
  readPickerOnline,
  readSkippedOrderIds,
  appendPickerHistory,
  clearChecklist,
  updateQueuedCount,
} from '@/lib/picker-storage';
import type { PickerOrder } from '@/lib/picker-types';
import {
  cachePickerOrders,
  enqueuePendingAction,
  readCachedPickerOrders,
  readPendingActions,
  writePendingActions,
} from '@/lib/picker-offline';
import { playNewOrderAlert, sortPickerOrders } from '@/lib/picker-order-utils';
import { showToast } from '@/lib/toast';

const POLL_MS = 12_000;
const MAX_RETRIES = 2;

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

function filterQueue(data: PickerOrder[]): PickerOrder[] {
  const skipped = readSkippedOrderIds();
  const online = readPickerOnline();
  const userId = authStorage.getUser()?.id;
  let list = data.filter((o) => !skipped.has(o.id));
  if (!online) {
    list = list.filter((o) => o.status === 'PICKING' && o.assignedPickerId === userId);
  }
  return sortPickerOrders(list);
}

export function usePickerOrders(onNewOrder?: (order: PickerOrder) => void) {
  const [orders, setOrders] = useState<PickerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const knownNewRef = useRef<Set<string>>(new Set());
  const onNewRef = useRef(onNewOrder);
  onNewRef.current = onNewOrder;

  const applyOrders = useCallback((list: PickerOrder[]) => {
    setOrders(list);
    cachePickerOrders(list);
    updateQueuedCount(list.filter((o) => o.status === 'NEW' || o.status === 'PICKING').length);
  }, []);

  const flushPending = useCallback(async () => {
    const pending = readPendingActions();
    if (!pending.length || !navigator.onLine) return;
    const token = authStorage.getAccessToken();
    const remaining = [];
    for (const item of pending) {
      try {
        if (item.type === 'start') {
          await api.patch(`/orders/${item.orderId}/start-picking`, {}, token);
        } else if (item.type === 'ready') {
          await api.patch(`/orders/${item.orderId}/ready`, {}, token);
        }
      } catch {
        remaining.push(item);
      }
    }
    writePendingActions(remaining);
  }, []);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setOffline(!navigator.onLine);

      if (!navigator.onLine) {
        applyOrders(filterQueue(readCachedPickerOrders()));
        setError('Oflayn — keshlangan buyurtmalar');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const token = authStorage.getAccessToken();
        const data = await apiWithRetry(() => api.get<PickerOrder[]>('/orders/picker', token));
        const filtered = filterQueue(data);

        for (const o of filtered) {
          if (o.status === 'NEW' && readPickerOnline() && !knownNewRef.current.has(o.id)) {
            knownNewRef.current.add(o.id);
            playNewOrderAlert();
            onNewRef.current?.(o);
          }
        }

        applyOrders(filtered);
        setError('');
        await flushPending();
      } catch (err) {
        const cached = readCachedPickerOrders();
        if (cached.length) applyOrders(filterQueue(cached));
        setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyOrders, flushPending],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const onChange = () => void loadOrders(true);
    window.addEventListener(PICKER_ONLINE_CHANGED, onChange);
    window.addEventListener('online', onChange);
    const id = window.setInterval(() => void loadOrders(true), POLL_MS);
    return () => {
      window.removeEventListener(PICKER_ONLINE_CHANGED, onChange);
      window.removeEventListener('online', onChange);
      window.clearInterval(id);
    };
  }, [loadOrders]);

  const patchOrder = useCallback(
    async (orderId: string, action: 'start-picking' | 'ready', order?: PickerOrder) => {
      if (!navigator.onLine) {
        enqueuePendingAction({ type: action === 'start-picking' ? 'start' : 'ready', orderId });
        showToast({ type: 'info', message: 'Onlayn bo‘lganda yuboriladi' });
        await loadOrders(true);
        return;
      }
      const token = authStorage.getAccessToken();
      await apiWithRetry(() => api.patch(`/orders/${orderId}/${action}`, {}, token));
      if (action === 'ready' && order) {
        const start = order.pickingAt ? new Date(order.pickingAt).getTime() : Date.now() - 5 * 60_000;
        const mins = Math.max(1, Math.round((Date.now() - start) / 60_000));
        appendPickerHistory(order, mins);
        clearChecklist(orderId);
      }
      showToast({
        type: 'success',
        message: action === 'start-picking' ? 'Yig‘ish boshlandi' : 'Tayyor deb belgilandi',
      });
      await loadOrders(true);
    },
    [loadOrders],
  );

  const startPicking = useCallback(
    (orderId: string) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'PICKING' as const, pickingAt: new Date().toISOString() } : o)),
      );
      return patchOrder(orderId, 'start-picking');
    },
    [patchOrder],
  );

  const markReady = useCallback(
    (order: PickerOrder) => {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      return patchOrder(order.id, 'ready', order);
    },
    [patchOrder],
  );

  return {
    orders,
    loading,
    refreshing,
    error,
    offline,
    loadOrders,
    startPicking,
    markReady,
  };
}
