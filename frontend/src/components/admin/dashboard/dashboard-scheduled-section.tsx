'use client';

import type { AdminDashboard } from '@/types/admin-dashboard';
import { DashboardSection } from './dashboard-ui';

export function DashboardScheduledSection(props: {
  kpis: AdminDashboard['kpis'] | null;
  loading: boolean;
}) {
  const slots = props.kpis?.busiestDeliverySlots ?? [];

  return (
    <DashboardSection title="Rejalashtirilgan yetkazish" subtitle="Bugun va eng band vaqt oralig‘i">
      {props.loading ? (
        <div className="bb-skeleton h-24 w-full rounded-lg" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-violet-700">Kelgusi</p>
              <p className="text-lg font-bold text-violet-950">{props.kpis?.scheduledUpcoming ?? 0}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-violet-700">Bugun</p>
              <p className="text-lg font-bold text-violet-950">{props.kpis?.scheduledTodayCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase text-violet-700">Bugun tushum</p>
              <p className="text-sm font-bold text-violet-950 tabular-nums">
                {(props.kpis?.scheduledTodayRevenue ?? 0).toLocaleString('uz-UZ')} so&apos;m
              </p>
            </div>
          </div>
          {slots.length > 0 ? (
            <ul className="space-y-1.5">
              {slots.map((row) => (
                <li
                  key={row.slot ?? 'unknown'}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-slate-800">{row.slot ?? '—'}</span>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800">
                    {row.orders} buyurtma
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Hozircha band vaqt oralig‘i yo‘q</p>
          )}
        </div>
      )}
    </DashboardSection>
  );
}
