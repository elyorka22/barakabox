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
import type { PickerDashboardPayload, PickerOrder } from '@/lib/picker-types';
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
const POLL_HIDDEN_MS = 30_000;
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

function mergeDashboardOrders(payload: PickerDashboardPayload): PickerOrder[] {
  const byId = new Map<string, PickerOrder>();
  for (const order of payload.activeOrders ?? []) byId.set(order.id, order);
  for (const order of payload.scheduledOrders ?? []) {
    if (!byId.has(order.id)) byId.set(order.id, order);
  }
  return sortPickerOrders([...byId.values()], payload.stats?.prepLeadMinutes ?? 60);
}

function filterQueue(data: PickerOrder[]): PickerOrder[] {
  const skipped = readSkippedOrderIds();
  const online = readPickerOnline();
  const userId = authStorage.getUser()?.id;
  let list = data.filter((o) => !skipped.has(o.id));
  if (!online) {
    list = list.filter((o) => o.status === 'PICKING' && o.assignedPickerId === userId);
  }
  return list;
}

function ordersEqual(a: PickerOrder[], b: PickerOrder[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.status !== y.status) return false;
    if ((x.scheduledAt ?? '') !== (y.scheduledAt ?? '')) return false;
    if (x.items.length !== y.items.length) return false;
  }
  return true;
}

export function usePickerOrders(onNewOrder?: (order: PickerOrder) => void) {
  const [orders, setOrders] = useState<PickerOrder[]>([]);
  const [dashboardStats, setDashboardStats] = useState<PickerDashboardPayload['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const knownNewRef = useRef<Set<string>>(new Set());
  const prepLeadRef = useRef(60);
  const onNewRef = useRef(onNewOrder);
  onNewRef.current = onNewOrder;

  const applyOrders = useCallback((list: PickerOrder[]) => {
    setOrders((prev) => (ordersEqual(prev, list) ? prev : list));
    cachePickerOrders(list);
    updateQueuedCount(
      list.filter((o) => o.status === 'NEW' || o.status === 'PICKING' || o.status === 'PENDING_SCHEDULE')
        .length,
    );
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
        const payload = await apiWithRetry(() =>
          api.get<PickerDashboardPayload>('/orders/picker/dashboard', token),
        );
        prepLeadRef.current = payload.stats?.prepLeadMinutes ?? 60;
        setDashboardStats(payload.stats ?? null);
        const merged = filterQueue(mergeDashboardOrders(payload));

        for (const o of merged) {
          if (o.status === 'NEW' && readPickerOnline() && !knownNewRef.current.has(o.id)) {
            knownNewRef.current.add(o.id);
            playNewOrderAlert();
            onNewRef.current?.(o);
          }
        }

        applyOrders(merged);
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
    const schedule = () => {
      const ms = typeof document !== 'undefined' && document.hidden ? POLL_HIDDEN_MS : POLL_MS;
      return window.setInterval(() => void loadOrders(true), ms);
    };
    let id = schedule();
    const onVisibility = () => {
      window.clearInterval(id);
      id = schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(PICKER_ONLINE_CHANGED, onChange);
      window.removeEventListener('online', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
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
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'PICKING' as const, pickingAt: new Date().toISOString() }
            : o,
        ),
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
    dashboardStats,
    loading,
    refreshing,
    error,
    offline,
    loadOrders,
    startPicking,
    markReady,
  };
}
