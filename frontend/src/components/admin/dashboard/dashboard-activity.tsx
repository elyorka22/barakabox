'use client';

import { Activity } from 'lucide-react';
import type { AdminDashboard } from '@/types/admin-dashboard';

function statusClass(status: string) {
  if (status === 'NEW') return 'bg-slate-100 text-slate-700';
  if (status === 'PICKING' || status === 'READY') return 'bg-amber-100 text-amber-800';
  if (status === 'DELIVERING') return 'bg-blue-100 text-blue-800';
  if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-rose-100 text-rose-800';
}

export function DashboardActivityFeed(props: {
  items: AdminDashboard['recentActivity'];
  loading?: boolean;
}) {
  if (props.loading) {
    return (
      <ul className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </ul>
    );
  }
  if (props.items.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-500">Faollik yo&apos;q</p>;
  }
  return (
    <ul className="max-h-[320px] space-y-1.5 overflow-y-auto overscroll-contain">
      {props.items.map((item) => {
        const time = new Date(item.createdAt).toLocaleString('uz-UZ', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <li
            key={item.id}
            className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2"
          >
            <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-[#0f172a]">{item.message}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusClass(item.status)}`}>
                  {item.status}
                </span>
                {item.district ? (
                  <span className="truncate text-[9px] text-slate-500">{item.district}</span>
                ) : null}
                <span className="text-[9px] text-slate-400">{time}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
