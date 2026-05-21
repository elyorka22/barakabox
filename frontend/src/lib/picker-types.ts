export type PickerOrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export type PickerOrderItem = {
  id: string;
  /** Product display name (same as productName when API is current). */
  title: string;
  productName?: string;
  variantName?: string | null;
  /** Variant / flavor / size line for quick identification. */
  subtitle?: string;
  quantity: number;
  unitType?: string;
  sellingMode?: string | null;
  price: number;
  imageUrl?: string | null;
  sku?: string | null;
  barcode?: string | null;
  product?: { imageUrl?: string | null; name?: string } | null;
  variant?: { imageUrl?: string | null; title?: string; flavor?: string | null; size?: string | null } | null;
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
  deliveryLabel: string;
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
