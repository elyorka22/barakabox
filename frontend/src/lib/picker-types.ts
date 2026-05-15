export type PickerOrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export type PickerPriority = 'oddiy' | 'shoshilinch';

export type PickerOrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitType?: string;
  price: number;
  product?: { imageUrl?: string | null; name?: string } | null;
  variant?: { imageUrl?: string | null; title?: string } | null;
};

export type PickerOrder = {
  id: string;
  status: PickerOrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  formattedAddress?: string | null;
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
  customerName: string;
  deliveryAddress: string;
  totalAmount: number;
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

export type PickerChecklistState = {
  checkedIds: string[];
  notFoundIds: string[];
};
