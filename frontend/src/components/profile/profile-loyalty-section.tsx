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
    <section id="loyalty" className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-[#ECECEC] pb-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Bonus va jamg‘arma</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">Cashback va aksiyalar</p>
        </div>
        <span className="rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-medium text-[#166534]">
          {loyalty.tierTitle}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-3 py-2.5">
          <p className="text-[11px] text-[#6B7280]">Balans</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-[#111827]">{formatMoneyUz(loyalty.cashbackSoM)}</p>
        </div>
        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-3 py-2.5">
          <p className="text-[11px] text-[#6B7280]">Taklif bonusi</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-[#16A34A]">+{formatMoneyUz(loyalty.referralBonusSoM)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">Har bir taklif uchun</p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-[#ECECEC] rounded-xl border border-[#ECECEC] overflow-hidden">
        <Link
          href="/discounts"
          className="flex items-center gap-3 bg-white px-3 py-2.5 text-sm font-medium text-[#111827] transition active:bg-[#F9FAFB]"
        >
          <TicketPercent className="h-4 w-4 shrink-0 text-[#16A34A]" />
          Promo-kodlar va chegirmalar
        </Link>
        <button
          type="button"
          className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left text-sm font-medium text-[#111827] transition active:bg-[#F9FAFB]"
          onClick={() => {
            void navigator.clipboard?.writeText('CHUST-REFER-A');
          }}
        >
          <Share2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
          Havolani nusxalash
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ECECEC] bg-[#F0FDF4] px-3 py-2">
        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
        <p className="text-xs leading-snug text-[#374151]">
          Bu oy jami <span className="font-semibold text-[#111827]">{formatMoneyUz(loyalty.savedMonthSoM)}</span> tejadingiz.
        </p>
      </div>
    </section>
  );
}
