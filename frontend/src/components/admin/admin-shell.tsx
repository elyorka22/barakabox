'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Home, Menu, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_NAV_GROUPS, LOGOUT_ITEM, adminNavItemsForRole } from './admin-nav';
import { authStorage } from '@/lib/api';
import { getAbsoluteSiteUrlForNewTab, getPublicSiteHref } from '@/lib/admin-site-url';

const NAV_SECTION_STORAGE_KEY = 'bb-admin-nav-sections-v1';

type ExpandedMap = Record<string, boolean>;

const defaultExpanded = (): ExpandedMap => ({
  Asosiy: true,
  Boshqaruv: true,
  Monitoring: true,
  Tizim: true,
});

function loadExpanded(): ExpandedMap {
  if (typeof window === 'undefined') return defaultExpanded();
  try {
    const raw = localStorage.getItem(NAV_SECTION_STORAGE_KEY);
    if (!raw) return defaultExpanded();
    const parsed = JSON.parse(raw) as ExpandedMap;
    return { ...defaultExpanded(), ...parsed };
  } catch {
    return defaultExpanded();
  }
}

function useIsMdUp() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setMdUp(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return mdUp;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mdUp = useIsMdUp();
  const [sectionOpen, setSectionOpen] = useState<ExpandedMap>(defaultExpanded);

  useEffect(() => {
    setSectionOpen(loadExpanded());
  }, []);

  const persistSection = useCallback((next: ExpandedMap) => {
    setSectionOpen(next);
    try {
      localStorage.setItem(NAV_SECTION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const toggleSection = useCallback(
    (group: string) => {
      persistSection({ ...sectionOpen, [group]: !sectionOpen[group] });
    },
    [sectionOpen, persistSection],
  );

  const navItems = useMemo(() => adminNavItemsForRole(authStorage.getUser()?.role), []);

  const groupedItems = useMemo(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        group,
        items: navItems.filter((item) => item.group === group),
      })).filter((section) => section.items.length > 0),
    [navItems],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const drawerOpen = mobileOpen && !mdUp;

  useBodyScrollLock(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeMobile]);

  const logout = () => {
    void authStorage.logout().finally(() => {
      router.replace('/profile');
    });
  };

  const siteHref = getPublicSiteHref();
  const [newTabHref, setNewTabHref] = useState('');
  useEffect(() => {
    setNewTabHref(getAbsoluteSiteUrlForNewTab());
  }, []);

  return (
    <div className="min-h-dvh max-w-full overflow-x-hidden bg-[#F4F6FB] text-[#111827]">
      <div
        className={`sticky top-0 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden ${
          drawerOpen ? 'z-[60]' : 'z-[40]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-800 active:bg-slate-50"
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
          <p className="truncate text-sm font-semibold">Admin</p>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            ADMIN
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] min-w-0">
        {drawerOpen ? (
          <button
            type="button"
            aria-label="Sidebarni yopish"
            className="fixed inset-0 z-[45] bg-black/45 transition-opacity duration-200 md:hidden"
            onClick={closeMobile}
          />
        ) : null}

        <aside
          id="admin-sidebar"
          className={`fixed inset-y-0 left-0 z-[50] flex w-[min(85vw,18rem)] flex-col border-r border-slate-800/80 bg-[#0F172A] text-slate-100 shadow-xl transition-transform duration-[260ms] ease-out md:sticky md:top-0 md:z-0 md:h-[100dvh] md:max-h-[100dvh] md:w-64 md:shrink-0 md:translate-x-0 md:shadow-none ${
            drawerOpen || mdUp ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="shrink-0 border-b border-white/10 px-2.5 py-2 md:px-3 md:py-3">
            <p className="text-[13px] font-bold leading-tight">BarakaBox</p>
            <p className="text-[10px] text-slate-400">Admin panel</p>
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1 [-webkit-overflow-scrolling:touch] md:px-2.5"
            style={{ WebkitOverflowScrolling: 'touch' }}
            aria-label="Admin menyu"
          >
            <div className="space-y-0.5 md:space-y-2">
              {groupedItems.map(({ group, items }) => {
                const expanded = mdUp ? true : (sectionOpen[group] ?? true);
                return (
                  <div key={group} className="rounded-lg md:rounded-none">
                    {mdUp ? (
                      <p className="mb-0.5 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {group}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 active:bg-white/5"
                        aria-expanded={expanded}
                        onClick={() => toggleSection(group)}
                      >
                        <span>{group}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                    )}
                    <div className={expanded ? 'space-y-0.5 pb-1' : 'hidden'}>
                      {items.map((item) => {
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMobile}
                            className={`flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition ${
                              active
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-200 hover:bg-white/10 active:bg-white/15'
                            }`}
                          >
                            <item.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="shrink-0 space-y-1.5 border-t border-white/10 bg-[#0c1422] px-2 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:bg-[#0F172A]">
            <Link
              href={siteHref}
              onClick={closeMobile}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 text-[13px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20 active:bg-emerald-500/25"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden />
              <span>Saytga qaytish</span>
            </Link>
            {newTabHref ? (
              <a
                href={newTabHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-9 items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-200"
              >
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                Yangi oynada ochish
              </a>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-11 w-full items-center gap-2 rounded-md border border-rose-400/30 px-2 py-1.5 text-[13px] text-rose-200 transition hover:bg-rose-500/15 active:bg-rose-500/25"
            >
              <LOGOUT_ITEM.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{LOGOUT_ITEM.label}</span>
            </button>
          </div>
        </aside>

        <div className="w-full min-w-0">
          <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur md:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Admin / {pathname.replace('/admin', '') || 'dashboard'}</p>
                <h1 className="text-lg font-semibold">Boshqaruv markazi</h1>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Online</span>
            </div>
          </header>
          <main className="min-h-[calc(100dvh-3.5rem)] min-w-0 max-w-full overflow-x-hidden px-2 py-3 pb-8 sm:px-3 md:min-h-[calc(100vh-4rem)] md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
