'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import {
  LOYALTY_LABELS,
  loyaltyBadgeClass,
  type CustomerLoyaltyTier,
} from '@/lib/customer-loyalty';

type CustomerRow = {
  id: string;
  phone: string;
  name: string | null;
  cashbackBalance: number;
  totalSpent: number;
  totalOrders: number;
  averageOrderAmount: number;
  lastOrderAt: string | null;
  loyaltyTier: CustomerLoyaltyTier;
  createdAt: string;
};

type CustomersResponse = {
  items: CustomerRow[];
  total: number;
  page: number;
  limit: number;
};

type CustomerStats = {
  totalCustomers: number;
  returningCustomers: number;
  returningPercent: number;
  repeatOrderRate: number;
  avgOrdersPerCustomer: number;
  totalRevenue: number;
  vipCount: number;
  activeThisMonth: number;
  topBySpent: Array<{
    id: string;
    phone: string;
    name: string | null;
    totalSpent: number;
    totalOrders: number;
    loyaltyTier: CustomerLoyaltyTier;
  }>;
  topByOrders: Array<{
    id: string;
    phone: string;
    name: string | null;
    totalSpent: number;
    totalOrders: number;
    loyaltyTier: CustomerLoyaltyTier;
  }>;
};

type SortKey =
  | 'totalSpent'
  | 'totalOrders'
  | 'cashbackBalance'
  | 'createdAt'
  | 'name'
  | 'phone'
  | 'lastOrderAt';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export function AdminUsersCustomers() {
  const token = authStorage.getAccessToken();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loyaltyFilter, setLoyaltyFilter] = useState<'ALL' | CustomerLoyaltyTier>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('totalSpent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await api.get<CustomerStats>('/admin/customer-stats', token);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortDir,
      });
      const q = appliedSearch.trim();
      if (q) params.set('q', q);
      if (loyaltyFilter !== 'ALL') params.set('loyalty', loyaltyFilter);
      const res = await api.get<CustomersResponse>(`/admin/customers?${params}`, token);
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token, page, appliedSearch, loyaltyFilter, sortBy, sortDir]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, loyaltyFilter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const exportCsv = () => {
    const header = [
      'Ism',
      'Telefon',
      'Keshbek',
      'Buyurtmalar',
      'Jami sarflangan',
      'O‘rtacha buyurtma',
      'Oxirgi buyurtma',
      'Segment',
      'Ro‘yxatdan o‘tgan',
    ];
    const lines = rows.map((c) =>
      [
        c.name ?? '',
        c.phone,
        c.cashbackBalance,
        c.totalOrders,
        c.totalSpent,
        c.averageOrderAmount,
        c.lastOrderAt ?? '',
        LOYALTY_LABELS[c.loyaltyTier],
        c.createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([`\uFEFF${[header.join(','), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mijozlar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {statsLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jami mijozlar" value={String(stats.totalCustomers)} />
          <StatCard label="Qaytgan mijozlar" value={`${stats.returningPercent}%`} sub={`${stats.returningCustomers} ta`} />
          <StatCard label="Takror buyurtma" value={`${stats.repeatOrderRate}%`} sub={`Ø ${stats.avgOrdersPerCustomer} buyurtma`} />
          <StatCard label="Shu oy faol" value={String(stats.activeThisMonth)} sub={`VIP: ${stats.vipCount}`} />
        </div>
      ) : null}

      {(stats?.topBySpent.length ?? 0) > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <TopList title="Eng ko‘p sarflaganlar" items={stats!.topBySpent} />
          <TopList title="Eng faol mijozlar" items={stats!.topByOrders} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm md:min-w-[200px]"
          placeholder="Telefon yoki ism bo‘yicha qidirish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedSearch(search.trim());
          }}
        />
        <select
          className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={loyaltyFilter}
          onChange={(e) => setLoyaltyFilter(e.target.value as 'ALL' | CustomerLoyaltyTier)}
        >
          <option value="ALL">Barcha segmentlar</option>
          {(Object.keys(LOYALTY_LABELS) as CustomerLoyaltyTier[]).map((t) => (
            <option key={t} value={t}>
              {LOYALTY_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
          onClick={() => setAppliedSearch(search.trim())}
        >
          Qidirish
        </button>
        <button
          type="button"
          className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          CSV eksport
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="bb-scrollbar-hide overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort('name')}>
                Mijoz{sortIndicator('name')}
              </th>
              <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort('phone')}>
                Telefon{sortIndicator('phone')}
              </th>
              <th className="cursor-pointer px-3 py-2.5 text-right" onClick={() => toggleSort('cashbackBalance')}>
                Keshbek{sortIndicator('cashbackBalance')}
              </th>
              <th className="cursor-pointer px-3 py-2.5 text-right" onClick={() => toggleSort('totalOrders')}>
                Buyurtmalar{sortIndicator('totalOrders')}
              </th>
              <th className="cursor-pointer px-3 py-2.5 text-right" onClick={() => toggleSort('totalSpent')}>
                Jami sarflangan{sortIndicator('totalSpent')}
              </th>
              <th className="px-3 py-2.5 text-right">O‘rtacha</th>
              <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort('lastOrderAt')}>
                Oxirgi buyurtma{sortIndicator('lastOrderAt')}
              </th>
              <th className="px-3 py-2.5">Segment</th>
              <th className="cursor-pointer px-3 py-2.5" onClick={() => toggleSort('createdAt')}>
                Ro‘yxat{sortIndicator('createdAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8">
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                  Mijoz topilmadi
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-medium text-slate-900">{c.name ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.phone}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoneyUz(c.cashbackBalance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.totalOrders}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatMoneyUz(c.totalSpent)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {formatMoneyUz(c.averageOrderAmount)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {formatDate(c.lastOrderAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${loyaltyBadgeClass(c.loyaltyTier)}`}
                    >
                      {LOYALTY_LABELS[c.loyaltyTier]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            {total} ta mijoz · {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Oldingi
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Keyingi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0f172a]">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: CustomerStats['topBySpent'];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((c, i) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="text-slate-400">{i + 1}. </span>
              {c.name ?? c.phone}
            </span>
            <span className="shrink-0 font-medium tabular-nums">{formatMoneyUz(c.totalSpent)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
