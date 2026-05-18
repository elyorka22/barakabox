export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export type AdminDashboard = {
  period: DashboardPeriod;
  generatedAt: string;
  kpis: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    activeCustomers: number;
    repeatCustomerPercent: number;
    deliveredPercent: number;
    pendingOrders: number;
    todayRevenue: number;
    todayOrders: number;
    activeProducts: number;
    growth: {
      ordersPercent: number;
      revenuePercent: number;
      aovPercent: number;
    };
  };
  timeSeries: Array<{
    label: string;
    date: string;
    orders: number;
    revenue: number;
    avgBasket: number;
    deliverySuccessRate: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    categoryName: string | null;
    imageUrl: string | null;
    quantitySold: number;
    revenue: number;
    growthPercent: number;
    remainingStock: number;
    unit: string;
  }>;
  topCategories: Array<{
    categoryId: string | null;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  fastGrowingProducts: AdminDashboard['topProducts'];
  inventory: {
    lowStock: Array<{
      id: string;
      name: string;
      stockQuantity: number;
      unit: string;
      imageThumbUrl: string | null;
      imageUrl: string | null;
    }>;
    outOfStock: AdminDashboard['inventory']['lowStock'];
  };
  customers: {
    totalCustomers: number;
    returningPercent: number;
    repeatOrderRate: number;
    avgOrdersPerCustomer: number;
    activeThisMonth: number;
    topBySpent: Array<{
      id: string;
      name: string | null;
      phone: string;
      totalSpent: number;
      totalOrders: number;
    }>;
    topByOrders: AdminDashboard['customers']['topBySpent'];
  };
  districts: Array<{ label: string; orders: number; revenue: number }>;
  couriers: Array<{
    id: string;
    name: string;
    completedDeliveries: number;
    failedDeliveries: number;
    revenueDelivered: number;
  }>;
  categories: {
    items: AdminDashboard['topCategories'];
    highestVolume: AdminDashboard['topCategories'][number] | null;
    highestRevenue: AdminDashboard['topCategories'][number] | null;
    slowest: AdminDashboard['topCategories'][number] | null;
  };
  recentActivity: Array<{
    id: string;
    type: 'order';
    status: string;
    message: string;
    district: string | null;
    createdAt: string;
  }>;
};
