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
    <section id="settings" className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm">
      <div className="border-b border-[#ECECEC] px-4 py-3">
        <p className="text-sm font-semibold text-[#111827]">Hisob sozlamalari</p>
        <p className="text-xs text-[#6B7280]">Ikkinchi darajali harakatlar</p>
      </div>
      <div className="divide-y divide-[#ECECEC]">
        {tiles.map((tile) => (
          <ProfileSettingsTile key={`${tile.label}-${tile.href ?? ''}`} {...tile} />
        ))}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-[#FEF2F2]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-[#B91C1C]">Chiqish</span>
        </button>
      </div>
    </section>
  );
}

function ProfileSettingsTile(tile: Tile) {
  const Icon = tile.icon;
  const inner: ReactNode = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#ECECEC] bg-[#FAFAFA]">
        <Icon className="h-4 w-4 text-[#4B5563]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#111827]">{tile.label}</span>
        {tile.sub ? <span className="block text-[11px] text-[#6B7280]">{tile.sub}</span> : null}
      </span>
      <span className="text-[#D1D5DB]">›</span>
    </>
  );

  if (tile.onClick) {
    return (
      <button type="button" onClick={tile.onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-[#FAFAFA]">
        {inner}
      </button>
    );
  }
  if (tile.href) {
    return (
      <Link
        href={tile.href}
        {...(tile.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className="flex items-center gap-3 px-4 py-3.5 transition active:bg-[#FAFAFA]"
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
