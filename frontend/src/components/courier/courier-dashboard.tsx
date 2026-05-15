'use client';

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authStorage, api } from '@/lib/api';
import { readCourierOnline, writeCourierOnline } from '@/lib/courier-storage';
import type { CourierOrder, CourierTab, CourierHistoryEntry } from '@/lib/courier-types';
import { useCourierOrders } from '@/hooks/use-courier-orders';
import { useCourierStats } from '@/hooks/use-courier-stats';
import { CourierHeader } from './courier-header';
import { CourierStatsGrid } from './courier-stats-grid';
import { CourierAvailabilityToggle } from './courier-availability-toggle';
import { CourierOrderCard } from './courier-order-card';
import { CourierEmptyState } from './courier-empty-state';
import { CourierBottomNav } from './courier-bottom-nav';
import { CourierSkeleton } from './courier-skeleton';
import { CourierPullRefresh } from './courier-pull-refresh';
import { CourierNewOrderModal } from './courier-new-order-modal';
import { CourierHero } from './courier-hero';
import { CourierShiftPanel } from './courier-shift-panel';
import { CourierPerformanceSection } from './courier-performance-section';
import { CourierHistoryList } from './courier-history-list';
import { formatMoneyUz } from '@/lib/format';
import { formatOnlineDuration } from '@/lib/courier-storage';
import { showToast } from '@/lib/toast';

const LazyPerformance = lazy(() =>
  import('./courier-performance-section').then((m) => ({ default: m.CourierPerformanceSection })),
);

export function CourierDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<CourierTab>('active');
  const [online, setOnline] = useState(true);
  const [popupOrder, setPopupOrder] = useState<CourierOrder | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<CourierHistoryEntry[]>([]);

  const { stats, loading: statsLoading, load: loadStats, startShift, endShift } = useCourierStats();

  const onNewReady = useCallback((order: CourierOrder) => {
    if (readCourierOnline()) setPopupOrder(order);
  }, []);

  const {
    orders,
    loading,
    refreshing,
    error,
    offline,
    loadOrders,
    acceptOrder,
    completeOrder,
    rejectOrder,
  } = useCourierOrders(onNewReady);

  const loadHistory = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      const rows = await api.get<
        Array<{ id: string; customerName: string; customerPhone: string; deliveryAddress: string; formattedAddress?: string; totalAmount: number; deliveredAt: string | null }>
      >('/orders/courier/history', token);
      setHistory(
        rows
          .filter((r) => r.deliveredAt)
          .map((r) => ({
            id: r.id,
            customerName: r.customerName,
            customerPhone: r.customerPhone,
            deliveryAddress: r.formattedAddress || r.deliveryAddress,
            totalAmount: r.totalAmount,
            deliveredAt: r.deliveredAt!,
          })),
      );
    } catch {
      setHistory([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadOrders(true), loadStats(true), loadHistory()]);
  }, [loadOrders, loadStats, loadHistory]);

  useEffect(() => {
    setOnline(readCourierOnline());
    void loadHistory();
  }, [loadHistory]);

  const handleOnlineChange = (next: boolean) => {
    writeCourierOnline(next);
    setOnline(next);
    showToast({ type: 'info', message: next ? 'Onlayn' : 'Oflayn' });
    void loadOrders(true);
  };

  const handleAccept = async (order: CourierOrder) => {
    setActionBusy(order.id);
    try {
      await acceptOrder(order.id);
      setPopupOrder(null);
      await loadStats(true);
    } catch (e) {
      showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleReject = async (order: CourierOrder, reason?: string) => {
    setActionBusy(order.id);
    try {
      await rejectOrder(order.id, reason);
      setPopupOrder(null);
    } catch (e) {
      showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleComplete = async (order: CourierOrder) => {
    setActionBusy(order.id);
    try {
      await completeOrder(order.id);
      await loadStats(true);
      await loadHistory();
    } catch (e) {
      showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
    } finally {
      setActionBusy(null);
    }
  };

  const logout = () => void authStorage.logout().finally(() => router.replace('/staff/login'));
  const user = authStorage.getUser();

  return (
    <div className="min-h-screen bg-[#F7F7F7] dark:bg-slate-950">
      <CourierHeader online={online} refreshing={refreshing} onRefresh={() => void refresh()} onLogout={logout} />
      <CourierPullRefresh onRefresh={refresh}>
        <main className="mx-auto max-w-lg space-y-3 px-3 pb-24 pt-3">
          <CourierHero name={user?.fullName ?? 'Kuryer'} online={online} />
          {stats ? (
            <CourierStatsGrid period={stats.today} workedSeconds={stats.shift.workedSecondsToday} />
          ) : statsLoading ? (
            <CourierSkeleton />
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'active' ? (
                <>
                  <CourierAvailabilityToggle online={online} onChange={handleOnlineChange} />
                  {offline ? <p className="text-xs text-amber-700">Oflayn rejim — kesh</p> : null}
                  {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
                  {loading ? <CourierSkeleton /> : null}
                  {!loading && orders.length === 0 ? <CourierEmptyState offline={!online} /> : null}
                  {!loading && orders.length > 0 ? (
                    <ul className="space-y-3">
                      {orders.map((order) => (
                        <CourierOrderCard
                          key={order.id}
                          order={order}
                          busy={actionBusy === order.id}
                          onAccept={() => void handleAccept(order)}
                          onReject={() => void handleReject(order)}
                          onComplete={() => void handleComplete(order)}
                        />
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
              {tab === 'history' ? (
                history.length ? <CourierHistoryList items={history} /> : <CourierEmptyState />
              ) : null}
              {tab === 'stats' && stats ? (
                <div className="space-y-3">
                  <CourierShiftPanel shift={stats.shift} onStart={() => void startShift()} onEnd={() => void endShift()} />
                  <CourierStatsGrid period={stats.month} workedSeconds={stats.shift.workedSecondsToday} />
                  <Suspense fallback={<CourierSkeleton />}>
                    <LazyPerformance performance={stats.performance} />
                  </Suspense>
                  <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 text-sm">
                    <p className="font-semibold">Haftalik daromad</p>
                    <p className="text-[#16A34A]">{formatMoneyUz(stats.week.earningsSoM)}</p>
                    <p className="mt-2 font-semibold">Oylik</p>
                    <p className="text-[#16A34A]">{formatMoneyUz(stats.month.earningsSoM)}</p>
                  </div>
                </div>
              ) : null}
              {tab === 'profile' ? (
                <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
                  <p className="text-lg font-semibold">{user?.fullName}</p>
                  <p className="text-sm text-[#6B7280]">{user?.email}</p>
                  {stats ? (
                    <p className="mt-2 text-xs text-[#9CA3AF]">
                      Bugun: {formatMoneyUz(stats.today.earningsSoM)} · {formatOnlineDuration(stats.shift.workedSecondsToday)}
                    </p>
                  ) : null}
                  <button type="button" onClick={logout} className="mt-4 w-full rounded-2xl bg-rose-50 py-3 text-sm font-semibold text-rose-700">
                    Chiqish
                  </button>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </CourierPullRefresh>
      <CourierBottomNav tab={tab} onTab={setTab} activeCount={orders.length} />
      <CourierNewOrderModal
        order={popupOrder}
        busy={Boolean(actionBusy)}
        onAccept={() => popupOrder && void handleAccept(popupOrder)}
        onReject={() => popupOrder && void handleReject(popupOrder)}
        onClose={() => setPopupOrder(null)}
      />
    </div>
  );
}
