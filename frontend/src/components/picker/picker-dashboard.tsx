'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authStorage } from '@/lib/api';
import { readPickerOnline, writePickerOnline, formatPickerDuration, readSessionStartMs } from '@/lib/picker-storage';
import type { PickerTab } from '@/lib/picker-types';
import { usePickerOrders } from '@/hooks/use-picker-orders';
import { usePickerStats } from '@/hooks/use-picker-stats';
import { PickerHeader } from './picker-header';
import { PickerBottomNav } from './picker-bottom-nav';
import { PickerPullRefresh } from './picker-pull-refresh';
import { PickerStatsGrid } from './picker-stats-grid';
import { PickerAvailabilityToggle } from './picker-availability-toggle';
import { PickerOrderCard } from './picker-order-card';
import { PickerEmptyState } from './picker-empty-state';
import { PickerSkeleton } from './picker-skeleton';
import { PickerHistoryPanel } from './picker-history-panel';
import { PickerStatsPanel } from './picker-stats-panel';
import { PickerRefreshFab } from './picker-refresh-fab';
import { PickerScheduledPanel } from './picker-scheduled-panel';
import { showToast } from '@/lib/toast';

const TAB_ORDER: PickerTab[] = ['active', 'history', 'stats', 'profile'];

export function PickerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<PickerTab>('active');
  const [online, setOnline] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { stats, history, weekPicked, peakHour, refresh: refreshStats } = usePickerStats();
  const { orders, loading, refreshing, error, offline, loadOrders, startPicking, markReady } = usePickerOrders();

  const refresh = useCallback(async () => {
    await loadOrders(true);
    refreshStats();
  }, [loadOrders, refreshStats]);

  useEffect(() => {
    setOnline(readPickerOnline());
  }, []);

  const handleOnline = (next: boolean) => {
    writePickerOnline(next);
    setOnline(next);
    showToast({ type: 'info', message: next ? 'Onlayn' : 'Oflayn' });
    void loadOrders(true);
  };

  const logout = () => void authStorage.logout().finally(() => router.replace('/profile'));
  const user = authStorage.getUser();

  const swipeTab = (_: unknown, info: PanInfo) => {
    const idx = TAB_ORDER.indexOf(tab);
    if (info.offset.x < -80 && idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
    if (info.offset.x > 80 && idx > 0) setTab(TAB_ORDER[idx - 1]);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <PickerHeader online={online} refreshing={refreshing} onRefresh={() => void refresh()} onLogout={logout} />
      <PickerPullRefresh onRefresh={refresh}>
        <main className="mx-auto max-w-lg space-y-3 px-3 pb-24 pt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={swipeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'active' ? (
                <>
                  <PickerStatsGrid
                    queued={orders.length}
                    pickedToday={stats.pickedToday}
                    avgPickMinutes={stats.avgPickMinutes}
                    onlineSeconds={stats.onlineSeconds}
                  />
                  <PickerAvailabilityToggle online={online} onChange={handleOnline} />
                  <PickerScheduledPanel />
                  {offline ? <p className="text-xs text-amber-700">Oflayn — kesh</p> : null}
                  {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
                  {loading ? <PickerSkeleton /> : null}
                  {!loading && orders.length === 0 ? <PickerEmptyState offline={!online} /> : null}
                  {!loading && orders.length > 0 ? (
                    <ul className="space-y-3">
                      {orders.map((order) => (
                        <PickerOrderCard
                          key={order.id}
                          order={order}
                          busy={busyId === order.id}
                          onStart={async () => {
                            setBusyId(order.id);
                            try {
                              await startPicking(order.id);
                            } catch (e) {
                              showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          onReady={async () => {
                            setBusyId(order.id);
                            try {
                              await markReady(order);
                              refreshStats();
                            } catch (e) {
                              showToast({ type: 'error', message: e instanceof Error ? e.message : 'Xatolik' });
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        />
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}

              {tab === 'history' ? (
                history.length > 0 ? (
                  <PickerHistoryPanel items={history} />
                ) : (
                  <PickerEmptyState title="Tarix bo‘sh" subtitle="Tayyor buyurtmalar shu yerda saqlanadi" />
                )
              ) : null}

              {tab === 'stats' ? (
                <PickerStatsPanel stats={stats} history={history} weekPicked={weekPicked} peakHour={peakHour} />
              ) : null}

              {tab === 'profile' ? (
                <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
                  <p className="text-lg font-semibold text-[#111827]">{user?.fullName ?? 'Picker'}</p>
                  <p className="text-sm text-[#6B7280]">{user?.email}</p>
                  <div className="mt-4 space-y-2 rounded-xl bg-[#FAFAFA] p-3 text-sm">
                    <p className="flex justify-between">
                      <span className="text-[#6B7280]">Smena</span>
                      <span className="font-semibold text-[#16A34A]">{online ? 'Faol' : 'Yopiq'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-[#6B7280]">Bugun ish vaqti</span>
                      <span className="font-semibold">{formatPickerDuration(stats.onlineSeconds)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-[#6B7280]">Sessiya</span>
                      <span className="font-mono text-xs">
                        {readSessionStartMs()
                          ? new Date(readSessionStartMs()!).toLocaleTimeString('uz-UZ')
                          : '—'}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-[#6B7280]">Qurilma</span>
                      <span className="text-xs">{typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 32) + '…' : '—'}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-4 w-full rounded-2xl bg-rose-50 py-3 text-sm font-semibold text-rose-700"
                  >
                    Chiqish
                  </button>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </PickerPullRefresh>
      <PickerRefreshFab refreshing={refreshing} onRefresh={() => void refresh()} />
      <PickerBottomNav tab={tab} onTab={setTab} activeCount={orders.length} />
    </div>
  );
}
