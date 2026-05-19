export type BusinessDashboard = {
  business: {
    id: string;
    displayName: string;
    phone: string | null;
    address: string | null;
    description: string | null;
    logoUrl: string | null;
    status: string;
    login: string | null;
  };
  kpis: {
    todayOrders: number;
    todayRevenue: number;
    totalProducts: number;
    activeProducts: number;
    pendingOrders: number;
    averageOrderValue: number;
    repeatCustomers: number;
    monthOrders: number;
    monthGrowthPercent: number;
    totalRevenue: number;
    completedOrders: number;
  };
  inventory: {
    lowStock: Array<{ id: string; name: string; stockQuantity: number; unit: string }>;
    outOfStock: Array<{ id: string; name: string; stockQuantity: number; unit: string }>;
  };
  topProducts: Array<{
    productId: string | null;
    name: string;
    unit: string;
    soldQuantity: number;
  }>;
  dailySales: Array<{ date: string; orders: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    customerName: string;
    customerPhone: string;
    addressLabel: string | null;
    createdAt: string;
    itemCount: number;
  }>;
};
