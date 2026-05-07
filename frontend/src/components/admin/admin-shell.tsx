'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, LOGOUT_ITEM } from './admin-nav';
import { authStorage } from '@/lib/api';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groupedItems = useMemo(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        group,
        items: ADMIN_NAV_ITEMS.filter((item) => item.group === group),
      })),
    [],
  );

  const logout = () => {
    authStorage.clearAccessToken();
    router.replace('/profile');
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#111827]">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-xl border border-slate-200 p-2"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <p className="text-sm font-semibold">Admin Dashboard</p>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">ADMIN</span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-[#0F172A] px-3 py-4 text-slate-100 transition-transform duration-300 md:sticky md:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-4 rounded-2xl bg-white/10 p-3">
            <p className="text-sm font-semibold">BarakaBox Admin</p>
            <p className="mt-1 text-xs text-slate-300">Modern SaaS boshqaruv paneli</p>
          </div>
          <div className="space-y-3 overflow-y-auto pb-6">
            {groupedItems.map((group) => (
              <div key={group.group}>
                <p className="mb-1 px-2 text-[11px] uppercase tracking-wide text-slate-400">{group.group}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                          active ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex w-full items-center gap-2 rounded-xl border border-red-300/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20"
            >
              <LOGOUT_ITEM.icon className="h-4 w-4" />
              <span>{LOGOUT_ITEM.label}</span>
            </button>
          </div>
        </aside>

        <div className="w-full min-w-0">
          <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur md:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Admin / {pathname.replace('/admin', '') || 'dashboard'}</p>
                <h1 className="text-lg font-semibold">Boshqaruv markazi</h1>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Online
              </span>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
