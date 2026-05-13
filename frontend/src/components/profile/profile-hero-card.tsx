'use client';

import { motion } from 'framer-motion';
import { Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { formatMoneyUz } from '@/lib/format';
import type { ProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';

type ProfileHeroProps = {
  fullName: string;
  email: string;
  loyalty: ProfileLoyaltyDisplay;
};

export function ProfileHeroCard({ fullName, email, loyalty }: ProfileHeroProps) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm"
    >
      <div className="border-b border-[#ECECEC] bg-[#F4FBF6] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-sm font-semibold text-[#166534]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-[#111827]">{fullName}</h2>
                <p className="truncate text-xs text-[#6B7280]">{email}</p>
              </div>
              <Link
                href="#settings"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#ECECEC] bg-white text-[#374151] transition active:bg-[#F9FAFB]"
                aria-label="Sozlamalar"
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
            <p className="mt-2 inline-block rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-medium text-[#166534]">
              {loyalty.tierTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#ECECEC] px-1 py-1">
        <div className="px-3 py-3">
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280]">
            <Sparkles className="h-3 w-3 text-[#16A34A]" strokeWidth={2} />
            Cashback
          </div>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#111827]">{formatMoneyUz(loyalty.cashbackSoM)}</p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[11px] font-medium text-[#6B7280]">Bu oy tejadingiz</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#111827]">{formatMoneyUz(loyalty.savedMonthSoM)}</p>
        </div>
      </div>
    </motion.section>
  );
}
