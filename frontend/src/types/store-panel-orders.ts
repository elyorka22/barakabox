export type StoreOrderSummary = {
  active: number;
  picking: number;
  ready: number;
  delivering: number;
  deliveredToday: number;
};

export type StoreOrderListItem = {
  id: string;
  orderNumber: string | null;
  status: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  addressLabel: string | null;
  createdAt: string;
  isScheduled: boolean;
  deliverySlotLabel: string | null;
  itemCount: number;
  pickerName: string | null;
  courierName: string | null;
};

export type StoreOrdersPage = {
  items: StoreOrderListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StoreOrderTimelineStep = {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
};
