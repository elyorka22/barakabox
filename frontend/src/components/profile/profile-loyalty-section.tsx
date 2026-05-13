'use client';

import Link from 'next/link';
import { Gift, Share2, TicketPercent } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import type { ProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';

type Props = {
  loyalty: ProfileLoyaltyDisplay;
};

export function ProfileLoyaltySection({ loyalty }: Props) {
  return (
    <section id="loyalty" className="rounded-[20px] bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-emerald-100/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">Bonus va jamg‘arma</p>
          <p className="mt-0.5 text-xs text-slate-600">Cashback va takliflar bir joyda</p>
        </div>
        <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200/60">
          {loyalty.tierTitle}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-white">
          <p className="text-[11px] font-medium text-slate-500">Balans</p>
          <p className="mt-1 text-lg font-bold text-[#0f172a] tabular-nums">{formatMoneyUz(loyalty.cashbackSoM)}</p>
        </div>
        <div className="rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-white">
          <p className="text-[11px] font-medium text-slate-500">Do‘stlarni taklif qiling</p>
          <p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">
            +{formatMoneyUz(loyalty.referralBonusSoM)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Har bir taklif uchun bonus</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link
          href="/discounts"
          className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2.5 text-sm font-semibold text-[#111827] shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
        >
          <TicketPercent className="h-4 w-4 text-emerald-600" />
          Promo-kodlar
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2.5 text-left text-sm font-semibold text-[#111827] shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
          onClick={() => {
            void navigator.clipboard?.writeText('CHUST-REFER-A');
          }}
        >
          <Share2 className="h-4 w-4 text-teal-600" />
          Havolani nusxalash
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-600/10 px-3 py-2 ring-1 ring-emerald-200/50">
        <Gift className="h-4 w-4 shrink-0 text-emerald-700" />
        <p className="text-[11px] font-medium leading-snug text-emerald-900">
          Bu oy jami <span className="font-bold">{formatMoneyUz(loyalty.savedMonthSoM)}</span> tejadingiz — davom eting!
        </p>
      </div>
    </section>
  );
}
