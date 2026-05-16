'use client';

import Link from 'next/link';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { OrderProgressTracker } from '@/components/order/order-progress-tracker';
import type { useGuestOrderTracking } from '@/hooks/use-guest-order-tracking';
import { isTrackableOrderStatus } from '@/lib/order-track';

type TrackingState = ReturnType<typeof useGuestOrderTracking>;

type Props = {
  tracking: TrackingState;
  title?: string;
  showHomeLink?: boolean;
};

export function GuestOrderTrackingPanel({
  tracking,
  title = 'Buyurtmangiz',
  showHomeLink = false,
}: Props) {
  const { orders, selected, snapshot, loading, syncing, error, pickOrder, refresh } = tracking;

  if (!tracking.hydrated) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" aria-hidden />
        <p className="text-sm">Buyurtma tekshirilmoqda…</p>
      </div>
    );
  }

  if (!selected || !snapshot) {
    return null;
  }

  const showSwitcher = orders.length > 1;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#121212]">{title}</h2>
          <p className="text-xs text-slate-500">
            Kuzatish kodi: <span className="font-mono font-semibold">{selected.trackingCode}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(selected.trackingToken)}
          disabled={syncing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition active:bg-slate-50 disabled:opacity-50"
          aria-label="Yangilash"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showSwitcher ? (
        <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {orders.map((order) => {
            const active = order.trackingToken === selected.trackingToken;
            return (
              <button
                key={order.trackingToken}
                type="button"
                onClick={() => pickOrder(order.trackingToken)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  active
                    ? 'border-[#16A34A] bg-[#F0FDF4] ring-2 ring-[#16A34A]/15'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="font-mono font-bold">{order.trackingCode}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {isTrackableOrderStatus(order.status) ? 'Faol' : 'Yakunlangan'}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {syncing && !loading ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Holat yangilanmoqda…
        </p>
      ) : null}

      <OrderProgressTracker
        snapshot={snapshot}
        loading={loading}
        error={error}
        orderNumber={selected.trackingCode}
      />

      {showHomeLink ? (
        <Link
          href="/"
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#121212]"
        >
          Bosh sahifaga qaytish
        </Link>
      ) : null}

      {tracking.isTerminal && selected.status === 'DELIVERED' ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
          Buyurtma 24 soatgacha shu yerda saqlanadi
        </p>
      ) : null}
    </div>
  );
}
