'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Order = {
  id: string;
  status: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
};

const BASE_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun'];

export function DashboardCharts({ orders }: { orders: Order[] }) {
  const months = BASE_MONTHS.map((month, idx) => {
    const bucketOrders = orders.filter((_, i) => i % 6 === idx);
    return {
      month,
      revenue: bucketOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      orders: bucketOrders.length,
    };
  });

  return (
    <div className="grid h-full gap-4 md:grid-cols-2">
      <div className="h-full min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={months} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-full min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="orders" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
