'use client';

import { KpiCard } from './dashboard-ui';
import { formatMoneyUz } from '@/lib/format';
import type { AdminDashboard } from '@/types/admin-dashboard';

export function DashboardKpiGrid(props: { kpis: AdminDashboard['kpis'] | null; loading: boolean }) {
  const k = props.kpis;
  const g = k?.growth;

  const cards = [
    { label: 'Jami buyurtmalar', value: k?.totalOrders ?? 0, growth: g?.ordersPercent },
    { label: 'Jami tushum', value: formatMoneyUz(k?.totalRevenue ?? 0), growth: g?.revenuePercent },
    { label: "O'rtacha chek", value: formatMoneyUz(k?.averageOrderValue ?? 0), growth: g?.aovPercent },
    { label: 'Faol mijozlar', value: k?.activeCustomers ?? 0 },
    { label: 'Qayta buyurtma %', value: `${k?.repeatCustomerPercent ?? 0}%` },
    { label: 'Yetkazilgan %', value: `${k?.deliveredPercent ?? 0}%` },
    { label: 'Kutilayotgan', value: k?.pendingOrders ?? 0 },
    { label: 'Reja (kelgusi)', value: k?.scheduledUpcoming ?? 0 },
    { label: 'Bugun reja', value: k?.scheduledTodayCount ?? 0 },
    { label: 'Bugun reja tushum', value: formatMoneyUz(k?.scheduledTodayRevenue ?? 0) },
    { label: 'Bugun tushum', value: formatMoneyUz(k?.todayRevenue ?? 0) },
    { label: 'Bugun buyurtma', value: k?.todayOrders ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cards.map((card) => (
        <KpiCard
          key={card.label}
          label={card.label}
          value={card.value}
          growth={card.growth}
          loading={props.loading}
        />
      ))}
    </div>
  );
}
