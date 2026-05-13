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
    <section className="rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
      <p className="text-sm font-semibold text-[#0f172a]">Tezkor</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = badges?.[item.label];
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group relative flex flex-col items-center gap-2 rounded-2xl bg-slate-50/90 px-2 py-3 text-center ring-1 ring-slate-100 transition active:scale-[0.97] active:bg-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition group-active:scale-95">
                <Icon className="h-5 w-5 text-emerald-600" strokeWidth={2.2} />
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-[#111827]">{item.label}</span>
              {typeof badge === 'number' && badge > 0 ? (
                <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
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
