'use client';

import { formatMoneyUz } from '@/lib/format';
import type { ProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';

type Props = {
  fullName: string;
  email: string;
  loyalty: ProfileLoyaltyDisplay;
};

export function ProfileCompactHeader({ fullName, email, loyalty }: Props) {
  return (
    <header className="rounded-xl border border-[#ECECEC] bg-white px-4 py-3.5">
      <h2 className="truncate text-[17px] font-semibold tracking-tight text-[#111827]">{fullName}</h2>
      <p className="mt-0.5 truncate text-xs text-[#6B7280]">{email}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#F3F4F6] pt-3">
        <Stat label="Cashback" value={formatMoneyUz(loyalty.cashbackSoM)} />
        <Stat label="Jami xarid" value={formatMoneyUz(loyalty.totalPurchasesSoM)} />
      </dl>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#111827]">{value}</dd>
    </div>
  );
}
