'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Headphones,
  Languages,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Shield,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import type { ProfileRole } from '@/lib/profile-role';
import type { ProfileNotifCounts } from '@/lib/profile-notifications-storage';

type Tile = {
  href?: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

const ROLE_PANEL: Partial<Record<ProfileRole, Tile>> = {
  business: { href: '/business', label: 'Biznes paneli', icon: Building2 },
  admin: { href: '/admin', label: 'Admin panel', icon: LayoutDashboard },
  super_admin: { href: '/admin', label: 'Admin panel', icon: LayoutDashboard },
  courier: { href: '/courier', label: 'Kuryer paneli', icon: Truck },
  picker: { href: '/picker', label: 'Picker paneli', icon: PackageSearch },
};

export function ProfileSettingsSection({
  role,
  notifCounts,
  onLogout,
}: {
  role: ProfileRole;
  notifCounts: ProfileNotifCounts;
  onLogout: () => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const panel = ROLE_PANEL[role];

  return (
    <section id="settings" className="overflow-hidden rounded-xl border border-[#ECECEC] bg-white">
      <p className="border-b border-[#F3F4F6] px-4 py-2.5 text-xs font-semibold text-[#111827]">Sozlamalar</p>
      <div className="divide-y divide-[#F3F4F6]">
        {panel ? <SettingsRow {...panel} /> : null}
        <SettingsRow href="/checkout" label="To‘lov va manzil" icon={CreditCard} />
        <NotifToggle open={notifOpen} counts={notifCounts} onToggle={() => setNotifOpen((v) => !v)} />
        <SettingsRow label="Til" icon={Languages} />
        <SettingsRow label="Xavfsizlik" icon={Shield} />
        <SettingsRow href="https://t.me" label="Yordam" icon={Headphones} external />
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 border-t border-[#F3F4F6] px-4 py-3 text-left transition active:bg-[#FEF2F2]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-[#B91C1C]">Chiqish</span>
        </button>
      </div>
    </section>
  );
}

function SettingsRow({ href, label, icon: Icon, external }: Tile) {
  const inner = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAFA] text-[#4B5563]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="flex-1 text-sm font-medium text-[#111827]">{label}</span>
      {href ? <span className="text-[#D1D5DB]">›</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className="flex items-center gap-3 px-4 py-3 transition active:bg-[#FAFAFA]"
      >
        {inner}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 px-4 py-3 opacity-60">{inner}</div>;
}

function NotifToggle({
  open,
  counts,
  onToggle,
}: {
  open: boolean;
  counts: ProfileNotifCounts;
  onToggle: () => void;
}) {
  const total = counts.orders + counts.promotions + counts.delivery + counts.cashback;

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[#FAFAFA]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAFA] text-[#4B5563]">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="flex-1 text-sm font-medium text-[#111827]">Bildirishnomalar</span>
        {total > 0 ? (
          <span className="mr-1 rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
            {total > 9 ? '9+' : total}
          </span>
        ) : null}
        {open ? <ChevronUp className="h-4 w-4 text-[#9CA3AF]" /> : <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />}
      </button>
      {open ? (
        <ul className="border-t border-[#F3F4F6] bg-[#FAFAFA] px-4 py-2 text-xs text-[#6B7280]">
          <NotifLine label="Buyurtmalar" count={counts.orders} />
          <NotifLine label="Aksiyalar" count={counts.promotions} />
          <NotifLine label="Yetkazib berish" count={counts.delivery} />
          <NotifLine label="Cashback" count={counts.cashback} />
        </ul>
      ) : null}
    </>
  );
}

function NotifLine({ label, count }: { label: string; count: number }) {
  return (
    <li className="flex justify-between py-1.5">
      <span>{label}</span>
      <span className={count > 0 ? 'font-medium text-[#166534]' : 'text-[#D1D5DB]'}>
        {count > 0 ? (count > 9 ? '9+' : count) : '—'}
      </span>
    </li>
  );
}
