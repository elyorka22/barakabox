'use client';

import { motion } from 'framer-motion';
import { Crown, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { formatMoneyUz } from '@/lib/format';
import type { ProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';

type ProfileHeroProps = {
  fullName: string;
  email: string;
  loyalty: ProfileLoyaltyDisplay;
};

function tierAccent(tier: ProfileLoyaltyDisplay['tierKey']) {
  if (tier === 'vip') {
    return 'from-violet-600 via-fuchsia-600 to-rose-500';
  }
  if (tier === 'gold') {
    return 'from-emerald-600 via-teal-500 to-cyan-500';
  }
  return 'from-slate-500 via-slate-400 to-emerald-500';
}

export function ProfileHeroCard({ fullName, email, loyalty }: ProfileHeroProps) {
  const gradient = tierAccent(loyalty.tierKey);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="relative overflow-hidden rounded-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />

      <div className="relative px-4 pb-5 pt-5 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner ring-2 ring-white/30">
            {fullName.trim().charAt(0).toUpperCase() || '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight drop-shadow-sm">{fullName}</h2>
              <Link
                href="#settings"
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 transition active:scale-95"
                aria-label="Sozlamalar"
              >
                <Settings className="h-[18px] w-[18px] opacity-95" />
              </Link>
            </div>
            <p className="mt-0.5 truncate text-sm text-white/85">{email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs font-semibold text-white/95 ring-1 ring-white/20">
              <Crown className="h-3.5 w-3.5" />
              {loyalty.tierTitle}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/15">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Cashback
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight">{formatMoneyUz(loyalty.cashbackSoM)}</p>
          </div>
          <div className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/15">
            <p className="text-[11px] font-medium text-white/75">Bu oy tejadingiz</p>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight">{formatMoneyUz(loyalty.savedMonthSoM)}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
