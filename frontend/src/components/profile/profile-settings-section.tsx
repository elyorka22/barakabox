'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CreditCard,
  Globe,
  Headphones,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageSearch,
  Shield,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProfileRole } from '@/lib/profile-role';
type Tile = {
  href?: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  onClick?: () => void;
  external?: boolean;
};

const BASE_TILES: Tile[] = [
  { href: '/checkout', label: "To'lov va manzil", sub: 'Rasmiylashtirish', icon: CreditCard },
  { href: '/checkout', label: 'Saqlangan manzillar', sub: 'Yetkazib berish', icon: MapPin },
  { href: '#notifications', label: 'Bildirishnomalar', sub: 'Barcha kategoriyalar', icon: SlidersHorizontal },
  { href: '/discounts', label: 'Aksiyalar', sub: 'Chegirmalar oynasi', icon: Globe },
  { label: 'Yordam', sub: 'Qo‘llab-quvvatlash', icon: Headphones, href: 'https://t.me', external: true },
  { label: 'Til', sub: "O'zbek tili", icon: Languages },
  { label: 'Xavfsizlik', sub: 'Sessiya va parol', icon: Shield },
];

const ROLE_EXTRAS: Record<ProfileRole, { href: string; label: string; sub: string; icon: LucideIcon } | null> = {
  client: null,
  business: { href: '/business', label: 'Biznes paneli', sub: 'Do‘kon boshqaruvi', icon: Building2 },
  admin: { href: '/admin', label: 'Admin panel', sub: 'Boshqaruv', icon: LayoutDashboard },
  courier: { href: '/courier', label: 'Kuryer paneli', sub: 'Yetkazib berish', icon: Truck },
  picker: { href: '/picker', label: 'Picker paneli', sub: 'Buyurtmalar', icon: PackageSearch },
};

export function ProfileSettingsSection({
  role,
  onLogout,
}: {
  role: ProfileRole;
  onLogout: () => void;
}) {
  const extra = ROLE_EXTRAS[role];
  const tiles: Tile[] = extra ? [{ href: extra.href, label: extra.label, sub: extra.sub, icon: extra.icon }, ...BASE_TILES] : BASE_TILES;

  return (
    <section id="settings" className="rounded-[20px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-[#0f172a]">Hisob sozlamalari</p>
        <p className="text-xs text-slate-500">Ikkinchi darajali harakatlar</p>
      </div>
      <div className="divide-y divide-slate-100">
        {tiles.map((tile) => (
          <ProfileSettingsTile key={`${tile.label}-${tile.href ?? ''}`} {...tile} />
        ))}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-rose-50/80 active:bg-rose-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-rose-700">Chiqish</span>
        </button>
      </div>
    </section>
  );
}

function ProfileSettingsTile(tile: Tile) {
  const Icon = tile.icon;
  const inner: ReactNode = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
        <Icon className="h-4 w-4 text-slate-700" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#111827]">{tile.label}</span>
        {tile.sub ? <span className="block text-[11px] text-slate-500">{tile.sub}</span> : null}
      </span>
      <span className="text-slate-300">›</span>
    </>
  );

  if (tile.onClick) {
    return (
      <button type="button" onClick={tile.onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-50">
        {inner}
      </button>
    );
  }
  if (tile.href) {
    return (
      <Link
        href={tile.href}
        {...(tile.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-50"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex cursor-default items-center gap-3 px-4 py-3.5 opacity-70">
      {inner}
    </div>
  );
}
