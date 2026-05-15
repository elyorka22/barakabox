'use client';

import Link from 'next/link';
import { ClipboardList, Gift, MapPin, Wallet } from 'lucide-react';

type QuickItem = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  badge?: number;
};

const ITEMS: QuickItem[] = [
  { href: '/client', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/checkout', label: 'Manzillar', icon: MapPin },
  { href: '#bonus', label: 'Cashback', icon: Wallet },
  { href: '/discounts', label: 'Kuponlar', icon: Gift },
];

export function ProfileQuickActionsGrid({ badges }: { badges?: Partial<Record<string, number>> }) {
  return (
    <section className="grid grid-cols-2 gap-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const badge = badges?.[item.label];
        return (
          <Link
            key={item.label}
            href={item.href}
            className="relative flex items-center gap-2.5 rounded-xl border border-[#ECECEC] bg-white px-3 py-2.5 transition active:bg-[#FAFAFA]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#16A34A]">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="text-[13px] font-medium text-[#111827]">{item.label}</span>
            {typeof badge === 'number' && badge > 0 ? (
              <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 text-[9px] font-semibold text-white">
                {badge > 9 ? '9+' : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </section>
  );
}
