'use client';

import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

export function DashboardSection(props: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200/90 bg-white ${props.className ?? ''}`}>
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5 md:px-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0f172a]">{props.title}</h3>
          {props.subtitle ? <p className="text-[11px] text-slate-500">{props.subtitle}</p> : null}
        </div>
        {props.action}
      </div>
      <div className="p-3 md:p-4">{props.children}</div>
    </section>
  );
}

export function GrowthBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-[10px] font-medium text-slate-400">0%</span>;
  }
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(value)}%
    </span>
  );
}

export function KpiCard(props: {
  label: string;
  value: string | number;
  growth?: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{props.label}</p>
      {props.loading ? (
        <div className="mt-1.5 h-7 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <p className="text-lg font-bold tabular-nums tracking-tight text-[#0f172a]">{props.value}</p>
          {props.growth !== undefined ? <GrowthBadge value={props.growth} /> : null}
        </div>
      )}
    </div>
  );
}
