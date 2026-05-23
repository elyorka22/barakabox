export type StoreAnalyticsPeriod = 'day' | 'week' | 'month';

export type StoreAnalytics = {
  store: { id: string; name: string; slug: string };
  period: StoreAnalyticsPeriod;
  range: { start: string; end: string };
  kpis: {
    visitors: number;
    visitorsGrowth: number;
    productViews: number;
    productViewsGrowth: number;
    addToCart: number;
    checkouts: number;
    searches: number;
    orders: number;
    ordersGrowth: number;
    revenue: number;
    revenueGrowth: number;
    deliveredOrders: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  funnel: Array<{ step: string; count: number }>;
  topProducts: Array<{
    productId: string | null;
    name: string;
    soldQuantity: number;
    views: number;
  }>;
  dailySales: Array<{ date: string; orders: number; revenue: number }>;
  note: string | null;
};
