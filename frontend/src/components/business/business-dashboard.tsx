'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { useStorePanelDashboard } from '@/hooks/use-store-panel';
import { BusinessStatsGrid } from '@/components/business/business-stats-grid';
import { BusinessBottomNav, type BusinessTab } from '@/components/business/business-bottom-nav';
import { BusinessOrdersPanel } from '@/components/business/business-orders-panel';
import { BusinessProductsPanel } from '@/components/business/business-products-panel';
import { BusinessInventoryPanel } from '@/components/business/business-inventory-panel';
import { BusinessMarketplaceCatalogPanel } from '@/components/business/business-marketplace-catalog-panel';
import { StorePanelStats } from '@/components/business/store-panel-stats';
import { StoreInventoryPanel } from '@/components/business/store-inventory-panel';
import { StoreTopPanel } from '@/components/business/store-top-panel';
import { StoreTeamPanel } from '@/components/business/store-team-panel';
import { StoreAnalyticsPanel } from '@/components/business/store-analytics-panel';
import { formatMoneyUz } from '@/lib/format';
import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';

export function BusinessDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, reload, hasMarketplace: hasMarketplaceStore } =
    useStorePanelDashboard();
  const marketplaceOn = isMarketplaceEnabled();
  const hasMarketplace = marketplaceOn && hasMarketplaceStore;
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<BusinessTab>(
    initialTab === 'catalog' ||
      initialTab === 'orders' ||
      initialTab === 'inventory' ||
      initialTab === 'top' ||
      initialTab === 'stats' ||
      initialTab === 'team'
      ? initialTab
      : 'home',
  );

  useEffect(() => {
    if (!marketplaceOn) return;
    const token = authStorage.getAccessToken();
    if (!token || loading) return;
    void api
      .get<{ available: boolean; complete: boolean }>('/businesses/panel/onboarding', token)
      .then((status) => {
        if (status.available && !status.complete) {
          router.replace('/business/onboarding');
        }
      })
      .catch(() => undefined);
  }, [loading, router, marketplaceOn]);

  useEffect(() => {
    if (marketplaceOn) return;
    if (tab === 'inventory' || tab === 'top' || tab === 'stats' || tab === 'team') {
      setTab('home');
    }
  }, [marketplaceOn, tab]);

  const legacy = data?.legacy;
  const showTeam = (authStorage.getUser()?.role ?? '').toUpperCase() === 'STORE_OWNER';

  const maxDailyRevenue = useMemo(() => {
    if (!legacy?.dailySales.length) return 1;
    return Math.max(1, ...legacy.dailySales.map((d) => d.revenue));
  }, [legacy?.dailySales]);

  const pendingOrders = legacy?.kpis.pendingOrders ?? 0;
  const headerName = data?.store?.name ?? legacy?.business.displayName ?? 'Do‘kon';

  if (loading && !data) {
    return (
      <div className="space-y-3 p-4 pb-24">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 pb-24">
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-emerald-700"
          onClick={() => void reload()}
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Do‘kon paneli</p>
        <h1 className="text-lg font-bold text-[#111827]">{headerName}</h1>
        {legacy?.business.login ? (
          <p className="text-xs text-slate-500">Login: {legacy.business.login}</p>
        ) : null}
        {data?.store?.slug ? (
          <p className="text-xs text-slate-400">/{data.store.slug}</p>
        ) : null}
      </div>

      {tab === 'home' ? (
        <div className="space-y-4 p-4">
          {data?.marketplace ? <StorePanelStats marketplace={data.marketplace} /> : null}

          {legacy ? <BusinessStatsGrid kpis={legacy.kpis} /> : null}

          {legacy && legacy.dailySales.length > 0 ? (
            <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
              <h2 className="text-sm font-semibold text-[#111827]">7 kunlik savdo</h2>
              <div className="mt-3 flex h-24 items-end gap-1">
                {legacy.dailySales.map((day) => (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-emerald-500/90"
                      style={{ height: `${Math.max(8, (day.revenue / maxDailyRevenue) * 72)}px` }}
                      title={formatMoneyUz(day.revenue)}
                    />
                    <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {data?.marketplace?.inventory ? (
            <BusinessInventoryPanel
              inventory={{
                lowStock: data.marketplace.inventory.lowStock.map((p) => ({
                  id: p.id,
                  name: p.name,
                  stockQuantity: p.stock,
                  unit: 'dona',
                })),
                outOfStock: data.marketplace.inventory.outOfStock.map((p) => ({
                  id: p.id,
                  name: p.name,
                  stockQuantity: p.stock,
                  unit: 'dona',
                })),
              }}
            />
          ) : legacy ? (
            <BusinessInventoryPanel inventory={legacy.inventory} />
          ) : null}

          {marketplaceOn && !hasMarketplace ? (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Marketplace do‘koni ulanmagan. Admin migratsiya yoki do‘kon bog‘lashini bajarsin.
            </section>
          ) : null}

          {legacy && !marketplaceOn ? (
            <BusinessProductsPanel onRefresh={reload} />
          ) : legacy ? (
            <details className="rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-black/[0.04]">
              <summary className="cursor-pointer font-semibold text-slate-700">
                Legacy mahsulotlar (eski tizim)
              </summary>
              <div className="mt-3">
                <BusinessProductsPanel onRefresh={reload} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {tab === 'orders' ? <BusinessOrdersPanel onRefresh={reload} /> : null}

      {tab === 'catalog' ? (
        <div className="p-4 pb-24">
          {marketplaceOn && hasMarketplace ? (
            <BusinessMarketplaceCatalogPanel />
          ) : marketplaceOn ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Marketplace do‘koni ulanmadi</p>
              <p className="mt-1 text-xs text-amber-800">
                Biznes profili topilmadi yoki ruxsat yoʻq. Sahifani yangilang — tizim do‘konni avtomatik
                bog‘laydi.
              </p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-emerald-700"
                onClick={() => void reload()}
              >
                Qayta yuklash
              </button>
            </div>
          ) : (
            <BusinessProductsPanel onRefresh={reload} />
          )}
        </div>
      ) : null}

      {tab === 'inventory' ? (
        hasMarketplace ? (
          <StoreInventoryPanel />
        ) : (
          <p className="p-4 text-sm text-slate-500">Marketplace ombori ulanmagan.</p>
        )
      ) : null}

      {tab === 'top' ? (
        hasMarketplace ? (
          <StoreTopPanel />
        ) : (
          <p className="p-4 text-sm text-slate-500">Top mahsulotlar uchun marketplace kerak.</p>
        )
      ) : null}

      {tab === 'stats' ? (
        hasMarketplace ? (
          <StoreAnalyticsPanel />
        ) : (
          <p className="p-4 text-sm text-slate-500">Statistika uchun marketplace do‘koni kerak.</p>
        )
      ) : null}

      {tab === 'team' && showTeam ? <StoreTeamPanel /> : null}

      <BusinessBottomNav
        tab={tab}
        onTabChange={setTab}
        pendingCount={pendingOrders}
        showTeam={showTeam}
        marketplaceEnabled={marketplaceOn}
      />
    </div>
  );
}
