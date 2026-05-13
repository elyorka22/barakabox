'use client';

import Link from 'next/link';
import {
  ClipboardList,
  Gift,
  Headphones,
  Heart,
  MapPin,
  Wallet,
} from 'lucide-react';

type QuickItem = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  badge?: number;
};

const ITEMS: QuickItem[] = [
  { href: '/client', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/categories', label: 'Sevimlilar', icon: Heart },
  { href: '/checkout', label: 'Manzillar', icon: MapPin },
  { href: '#loyalty', label: 'Cashback', icon: Wallet },
  { href: '#loyalty', label: 'Kuponlar', icon: Gift },
  { href: '#notifications', label: 'Qo‘llab-quvvatlash', icon: Headphones },
];

export function ProfileQuickActionsGrid({ badges }: { badges?: Partial<Record<string, number>> }) {
  return (
    <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#111827]">Tezkor</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = badges?.[item.label];
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-[#ECECEC] bg-white px-2 py-2.5 text-center transition active:bg-[#F9FAFB]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#16A34A]">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="line-clamp-2 text-[10px] font-medium leading-tight text-[#374151]">{item.label}</span>
              {typeof badge === 'number' && badge > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 text-[9px] font-semibold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
