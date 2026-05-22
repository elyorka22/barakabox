'use client';

import { CheckCircle2, X } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import type { GuestCompletedFlash } from '@/lib/guest-order-tracking-storage';

type Props = {
  flash: GuestCompletedFlash;
  onDismiss?: () => void;
};

export function GuestOrderCompletionBanner({ flash, onDismiss }: Props) {
  const delivered = flash.status === 'DELIVERED';
  const title = delivered
    ? 'Buyurtmangiz yetkazildi. Xaridingiz uchun rahmat.'
    : 'Buyurtma bekor qilindi';
  const showCashback = delivered && flash.cashbackEarnedTiyin > 0;

  return (
    <div
      className="overflow-hidden rounded-[22px] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/80"
      role="status"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            delivered ? 'bg-emerald-50 text-[#16A34A]' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-[#121212]">{title}</p>
          <p className="mt-1 text-[12px] text-slate-500">
            Buyurtma: <span className="font-mono font-semibold">#{flash.trackingCode}</span>
          </p>
          {showCashback ? (
            <p className="mt-2 text-[13px] font-semibold text-[#15803d]">
              {flash.cashbackCredited ? 'Keshbek hisobingizga qo‘shildi: ' : 'Keshbek: '}
              +{formatMoneyUz(flash.cashbackEarnedTiyin)}
            </p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
