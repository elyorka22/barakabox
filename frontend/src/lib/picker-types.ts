export type PickerOrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export type PickerDeliveryType = 'oddiy' | 'tezkor';

export type PickerOrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitType?: string;
  sellingMode?: string | null;
  price: number;
  product?: { imageUrl?: string | null; name?: string } | null;
  variant?: { imageUrl?: string | null; title?: string } | null;
};

/** API shape — picker UI must not display customer/delivery/payment fields. */
export type PickerOrder = {
  id: string;
  status: PickerOrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  formattedAddress?: string | null;
  manualAddress?: string | null;
  deliveryNote?: string | null;
  totalAmount: number;
  subtotalAmount?: number;
  deliveryFee?: number;
  createdAt: string;
  pickingAt?: string | null;
  readyAt?: string | null;
  assignedPickerId?: string | null;
  items: PickerOrderItem[];
};

export type PickerTab = 'active' | 'history' | 'stats' | 'profile';

export type PickerHistoryEntry = {
  id: string;
  orderLabel: string;
  deliveryType: PickerDeliveryType;
  itemCount: number;
  completedAt: string;
  pickingMinutes: number;
};

export type PickerDayStats = {
  dateKey: string;
  queuedNow: number;
  pickedToday: number;
  avgPickMinutes: number;
  onlineSeconds: number;
  cancelledItems: number;
};
