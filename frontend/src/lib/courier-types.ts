export type CourierOrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export type OrderPriority = 'HOT' | 'DELAYED' | 'VIP' | 'LONG_DISTANCE';

export type CourierOrder = {
  id: string;
  status: CourierOrderStatus;
  totalAmount: number | string;
  subtotalAmount?: number;
  deliveryFee?: number;
  customerPhone: string;
  customerName: string;
  deliveryAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  manualAddress?: string | null;
  addressLabel?: string | null;
  deliveryNote?: string | null;
  createdAt: string;
  assignedCourierId?: string | null;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  priorities?: OrderPriority[];
  customer?: { totalOrders?: number } | null;
};

export type CourierTab = 'active' | 'history' | 'stats' | 'profile';

/** @deprecated Local-only cache; dashboard uses API stats. */
export type CourierDayStats = {
  dateKey: string;
  deliveriesCount: number;
  earningsSoM: number;
  completedOrders: number;
  onlineSeconds: number;
};

export type CourierPeriodStats = {
  deliveries: number;
  earningsSoM: number;
  deliveryFeeTotalSoM: number;
};

export type CourierStatsResponse = {
  today: CourierPeriodStats;
  week: CourierPeriodStats;
  month: CourierPeriodStats;
  performance: {
    acceptanceRate: number;
    completionRate: number;
    avgDeliveryMinutes: number;
    rating: number;
    activeStreakDays: number;
  };
  shift: {
    active: boolean;
    shiftId: string | null;
    startedAt: string | null;
    workedSecondsToday: number;
    shiftEarningsSoM: number;
  };
};

export type CourierHistoryEntry = {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  deliveryFee?: number;
  deliveredAt: string;
};

export type PendingCourierAction =
  | { type: 'accept'; orderId: string }
  | { type: 'complete'; orderId: string }
  | { type: 'reject'; orderId: string; reason?: string };
