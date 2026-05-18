'use client';

import Link from 'next/link';
import Image from 'next/image';
import { GrowthBadge } from './dashboard-ui';
import { formatMoneyUz } from '@/lib/format';
import { resolveProductImageUrl } from '@/lib/product-image';
import type { AdminDashboard } from '@/types/admin-dashboard';

function ProductThumb(props: { name: string; imageUrl: string | null }) {
  const src = resolveProductImageUrl({ imageUrl: props.imageUrl, imageThumbUrl: props.imageUrl });
  if (!src) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">
        {props.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-md object-cover"
      unoptimized
    />
  );
}

export function DashboardTopProducts(props: { items: AdminDashboard['topProducts']; loading?: boolean }) {
  if (props.loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-slate-100" />;
  }
  if (props.items.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-500">Ma&apos;lumot yo&apos;q</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-2">Mahsulot</th>
            <th className="pb-2 pr-2 text-right">Sotilgan</th>
            <th className="pb-2 pr-2 text-right">Tushum</th>
            <th className="pb-2 pr-2 text-right">O&apos;sish</th>
            <th className="pb-2 text-right">Qoldiq</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((p) => (
            <tr key={p.productId} className="border-b border-slate-50">
              <td className="py-2 pr-2">
                <div className="flex items-center gap-2">
                  <ProductThumb name={p.name} imageUrl={p.imageUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0f172a]">{p.name}</p>
                    {p.categoryName ? <p className="truncate text-[10px] text-slate-500">{p.categoryName}</p> : null}
                  </div>
                </div>
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {p.quantitySold} {p.unit}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums font-medium">{formatMoneyUz(p.revenue)}</td>
              <td className="py-2 pr-2 text-right">
                <GrowthBadge value={p.growthPercent} />
              </td>
              <td className="py-2 text-right">
                <span
                  className={`tabular-nums font-medium ${
                    p.remainingStock <= 5 ? 'text-amber-700' : 'text-slate-700'
                  }`}
                >
                  {p.remainingStock} {p.unit}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardInventoryAlerts(props: {
  lowStock: AdminDashboard['inventory']['lowStock'];
  outOfStock: AdminDashboard['inventory']['outOfStock'];
  loading?: boolean;
}) {
  if (props.loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-slate-100" />;
  }
  const rows = [
    ...props.outOfStock.map((p) => ({ ...p, urgency: 'critical' as const })),
    ...props.lowStock.map((p) => ({ ...p, urgency: 'warning' as const })),
  ].slice(0, 12);

  if (rows.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">Ombor holati yaxshi</p>;
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((p) => (
        <li
          key={p.id}
          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
            p.urgency === 'critical'
              ? 'border-rose-200 bg-rose-50/80'
              : 'border-amber-200 bg-amber-50/60'
          }`}
        >
          <span className="min-w-0 truncate font-medium text-[#0f172a]">{p.name}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              p.urgency === 'critical' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {p.stockQuantity <= 0 ? 'Tugagan' : `${p.stockQuantity} ${p.unit}`}
          </span>
        </li>
      ))}
      <li>
        <Link href="/admin/products?stock=low" className="text-[11px] font-semibold text-emerald-700 hover:underline">
          Barcha kam qolganlar →
        </Link>
      </li>
    </ul>
  );
}

export function DashboardDistricts(props: { items: AdminDashboard['districts']; loading?: boolean }) {
  if (props.loading) return <div className="h-36 animate-pulse rounded-lg bg-slate-100" />;
  const maxOrders = Math.max(...props.items.map((d) => d.orders), 1);
  return (
    <ul className="space-y-2">
      {props.items.map((d) => (
        <li key={d.label}>
          <div className="mb-0.5 flex justify-between gap-2 text-xs">
            <span className="truncate font-medium text-[#0f172a]">{d.label}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {d.orders} · {formatMoneyUz(d.revenue)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.round((d.orders / maxOrders) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardCouriers(props: { items: AdminDashboard['couriers']; loading?: boolean }) {
  if (props.loading) return <div className="h-36 animate-pulse rounded-lg bg-slate-100" />;
  if (props.items.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">Kuryer statistikasi yo&apos;q</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase text-slate-500">
            <th className="pb-2 text-left">Kuryer</th>
            <th className="pb-2 text-right">Yetkazilgan</th>
            <th className="pb-2 text-right">Rad</th>
            <th className="pb-2 text-right">Tushum</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((c) => (
            <tr key={c.id} className="border-b border-slate-50">
              <td className="py-2 font-medium">{c.name}</td>
              <td className="py-2 text-right tabular-nums text-emerald-700">{c.completedDeliveries}</td>
              <td className="py-2 text-right tabular-nums text-rose-600">{c.failedDeliveries}</td>
              <td className="py-2 text-right tabular-nums">{formatMoneyUz(c.revenueDelivered)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardCategories(props: {
  categories: AdminDashboard['categories'];
  topCategories: AdminDashboard['topCategories'];
  loading?: boolean;
}) {
  if (props.loading) return <div className="h-32 animate-pulse rounded-lg bg-slate-100" />;
  const { highestVolume, highestRevenue, slowest } = props.categories;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: 'Eng ko‘p hajm', item: highestVolume, metric: 'quantitySold' as const },
          { label: 'Eng yuqori tushum', item: highestRevenue, metric: 'revenue' as const },
          { label: 'Eng sekin', item: slowest, metric: 'quantitySold' as const },
        ].map((box) => (
          <div key={box.label} className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">{box.label}</p>
            <p className="mt-0.5 truncate text-sm font-bold text-[#0f172a]">{box.item?.name ?? '—'}</p>
            {box.item ? (
              <p className="text-[10px] text-slate-600">
                {box.metric === 'revenue'
                  ? formatMoneyUz(box.item.revenue)
                  : `${box.item.quantitySold} dona`}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <ul className="space-y-1">
        {props.topCategories.slice(0, 6).map((c) => (
          <li key={c.categoryId ?? c.name} className="flex justify-between text-xs">
            <span className="truncate font-medium">{c.name}</span>
            <span className="shrink-0 tabular-nums text-slate-600">{formatMoneyUz(c.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardCustomers(props: { customers: AdminDashboard['customers']; loading?: boolean }) {
  if (props.loading) return <div className="h-40 animate-pulse rounded-lg bg-slate-100" />;
  const c = props.customers;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          { label: 'Jami mijoz', value: c.totalCustomers },
          { label: 'Qaytuvchi %', value: `${c.returningPercent}%` },
          { label: 'Qayta buyurtma', value: `${c.repeatOrderRate}%` },
          { label: 'Shu oy faol', value: c.activeThisMonth },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-100 px-2 py-1.5">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className="font-bold tabular-nums text-[#0f172a]">{s.value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">Top mijozlar (xarajat)</p>
        <ul className="space-y-1">
          {c.topBySpent.slice(0, 5).map((u, i) => (
            <li key={u.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                <span className="mr-1 text-slate-400">{i + 1}.</span>
                {u.name || u.phone}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatMoneyUz(u.totalSpent)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/admin/users?tab=customers" className="text-[11px] font-semibold text-emerald-700 hover:underline">
        CRM → mijozlar
      </Link>
    </div>
  );
}
