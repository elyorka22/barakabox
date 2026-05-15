'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Package, Truck, XCircle } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import {
  ORDER_PROGRESS_STEPS,
  activeProgressStepIndex,
  type OrderTrackSnapshot,
} from '@/lib/order-track';

type Props = {
  snapshot: OrderTrackSnapshot | null;
  loading: boolean;
  error?: string;
  orderNumber?: string;
};

function StepIcon({ done, active, cancelled }: { done: boolean; active: boolean; cancelled: boolean }) {
  if (cancelled) {
    return <XCircle className="h-5 w-5 text-rose-500" aria-hidden />;
  }
  if (done) {
    return <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden />;
  }
  if (active) {
    return <Loader2 className="h-5 w-5 animate-spin text-[#16A34A]" aria-hidden />;
  }
  return <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />;
}

export function OrderProgressTracker({ snapshot, loading, error, orderNumber }: Props) {
  const status = snapshot?.status ?? 'NEW';
  const activeIdx = activeProgressStepIndex(status);
  const cancelled = status === 'CANCELLED';
  const delivered = status === 'DELIVERED';
  const showCashback =
    delivered &&
    snapshot &&
    snapshot.cashbackEarnedTiyin > 0 &&
    snapshot.cashbackCredited;

  return (
    <div className="mt-6 rounded-[24px] bg-white p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#16A34A]">Buyurtma holati</p>
        {orderNumber ? (
          <p className="mt-1 text-xs text-slate-500">#{orderNumber}</p>
        ) : snapshot?.id ? (
          <p className="mt-1 text-xs text-slate-500">#{snapshot.id.slice(-6).toUpperCase()}</p>
        ) : null}
      </div>

      {loading && !snapshot ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-6 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" aria-hidden />
          <p className="text-sm">Holat yuklanmoqda…</p>
        </div>
      ) : null}

      {error && !snapshot ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-800">{error}</p>
      ) : null}

      {cancelled ? (
        <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-rose-900">Buyurtma bekor qilindi</p>
          <p className="mt-1 text-xs text-rose-700">Savdo markazi bilan bog‘laning.</p>
        </div>
      ) : (
        <ol className="mt-6 space-y-0">
          {ORDER_PROGRESS_STEPS.map((step, idx) => {
            const done = activeIdx > idx || (delivered && idx <= 3);
            const active = activeIdx === idx && !delivered;
            const future = activeIdx < idx && !delivered;

            return (
              <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                {idx < ORDER_PROGRESS_STEPS.length - 1 ? (
                  <span
                    className={`absolute left-[17px] top-9 bottom-0 w-0.5 ${
                      done ? 'bg-[#16A34A]' : 'bg-slate-200'
                    }`}
                    aria-hidden
                  />
                ) : null}
                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                    done
                      ? 'border-[#16A34A] bg-[#16A34A]'
                      : active
                        ? 'border-[#16A34A] bg-[#F0FDF4]'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <StepIcon done={done} active={active} cancelled={false} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${step.id}-${active ? 'a' : done ? 'd' : 'f'}`}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`min-w-0 flex-1 pt-0.5 ${future ? 'opacity-45' : ''}`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        active ? 'text-[#16A34A]' : done ? 'text-[#111827]' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{step.description}</p>
                    {active && step.id === 'courier' && snapshot?.courierName ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#166534]">
                        <Truck className="h-3.5 w-3.5" />
                        {snapshot.courierName}
                      </p>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      )}

      <AnimatePresence>
        {showCashback ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold text-emerald-900">
              Hisobingizga {formatMoneyUz(snapshot!.cashbackEarnedTiyin)} cashback qo‘shildi
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {delivered ? (
        <div className="mt-5 flex items-center justify-center gap-2 text-emerald-700">
          <Package className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium">Yetkazib berish yakunlandi</span>
        </div>
      ) : null}

      <Link
        href="/"
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-[18px] border border-slate-200 bg-white text-[15px] font-semibold text-[#121212] transition active:bg-slate-50"
      >
        Bosh sahifa
      </Link>
    </div>
  );
}
