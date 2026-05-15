'use client';

import Link from 'next/link';
import { Share2, TicketPercent, Wallet } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import { showToast } from '@/lib/toast';
import type { ProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';

type Props = {
  loyalty: ProfileLoyaltyDisplay;
};

export function ProfileBonusCard({ loyalty }: Props) {
  const copyReferral = () => {
    void navigator.clipboard?.writeText('CHUST-REFER-A');
    showToast({ type: 'success', message: 'Taklif havolasi nusxalandi' });
  };

  return (
    <section id="bonus" className="rounded-xl border border-[#ECECEC] bg-white px-3 py-2.5">
      <p className="px-1 text-xs font-semibold text-[#111827]">Bonuslar</p>
      <div className="mt-2 divide-y divide-[#F3F4F6]">
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2} />
            <span className="text-sm text-[#374151]">Cashback balansi</span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#111827]">
            {formatMoneyUz(loyalty.cashbackSoM)}
          </span>
        </div>
        <Link
          href="/discounts"
          className="flex items-center gap-2 px-1 py-2 text-sm text-[#374151] transition active:bg-[#FAFAFA]"
        >
          <TicketPercent className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2} />
          <span className="flex-1">Promo-kodlar</span>
          <span className="text-[#D1D5DB]">›</span>
        </Link>
        {loyalty.referralBonusSoM > 0 ? (
          <button
            type="button"
            onClick={copyReferral}
            className="flex w-full items-center gap-2 px-1 py-2 text-left text-sm text-[#374151] transition active:bg-[#FAFAFA]"
          >
            <Share2 className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2} />
            <span className="flex-1">Do‘stlarga ulashish</span>
            <span className="text-[11px] font-medium text-[#16A34A]">+{formatMoneyUz(loyalty.referralBonusSoM)}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
