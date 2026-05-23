export type AdminAnalyticsPeriod = 'day' | 'week' | 'month';

export type AdminAnalyticsOverview = {
  period: AdminAnalyticsPeriod;
  range: { start: string; end: string };
  visitors: {
    pageViews: number;
    pageViewsGrowth: number;
    uniqueVisitors: number;
    uniqueVisitorsGrowth: number;
    registeredVisitors: number;
    anonymousVisitors: number;
    returningRate: number;
    onlineNow: number;
  };
  behavior: {
    searches: number;
    avgPagesPerSession: number;
    productViews: number;
    addToCart: number;
    checkouts: number;
    cartConversion: number;
    checkoutConversion: number;
  };
  ecommerce: {
    orders: number;
    ordersGrowth: number;
    revenue: number;
    revenueGrowth: number;
    conversionRate: number;
    scheduledOrders: number;
    instantOrders: number;
  };
  products: {
    topViewed: Array<{ productId: string; title: string; count: number }>;
    topAdded: Array<{ productId: string; title: string; count: number }>;
    topCategories: Array<{ name: string; qty: number }>;
  };
  delivery: {
    avgDeliveryMinutes: number | null;
    busiestHours: Array<{ hour: number; orders: number }>;
    pickerPerformance: Array<{ staffId: string | null; name: string; completed: number }>;
    courierPerformance: Array<{ staffId: string | null; name: string; completed: number }>;
  };
  funnel: Array<{ label: string; views: number; carts: number; orders: number }>;
  errors: {
    apiErrors: number;
    cartFails: number;
    frontendErrors: number;
    slowRequests: number;
  };
};

export type AdminAnalyticsRealtime = {
  onlineUsers: number;
  onlineSessions: Array<{ sessionId: string; userId: string | null; guestId: string | null }>;
  liveOrders: Array<{
    id: string;
    orderNumber: string | null;
    status: string;
    totalAmount: number;
    customerName: string;
    createdAt: string;
  }>;
  todayOrders: number;
  todayRevenue: number;
  activePickers: number;
  activeCouriers: number;
  at: string;
};
