'use client';

import Link from 'next/link';
import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';
import {
  ArrowUpRight,
  Bike,
  Download,
  Package,
  Percent,
  Plus,
  AlertTriangle,
  FileBarChart,
} from 'lucide-react';

const ACTIONS = [
  { href: '/admin/global-catalog', label: 'Global katalog', icon: Package },
  { href: '/admin/products?drawer=new', label: 'Mahsulot qo‘shish', icon: Plus },
  { href: '/admin/coupons', label: 'Kupon yaratish', icon: Percent },
  { href: '/admin/users?tab=employees&role=COURIER', label: 'Kuryer qo‘shish', icon: Bike },
  { href: '/admin/orders', label: 'Buyurtmalarni eksport', icon: Download },
  { href: '/admin/products?stock=low', label: 'Kam qolganlar', icon: AlertTriangle },
  { href: '/admin/analytics', label: 'Hisobot', icon: FileBarChart },
];

export function DashboardQuickActions() {
  const actions = isMarketplaceEnabled()
    ? ACTIONS
    : ACTIONS.filter((a) => a.href !== '/admin/global-catalog');

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-medium text-[#0f172a] transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <action.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{action.label}</span>
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Link>
      ))}
    </div>
  );
}
