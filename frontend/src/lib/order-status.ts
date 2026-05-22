import type { OrderStatusLite } from '@/lib/last-order-storage';

/** Customer-facing 3-step lifecycle (maps legacy DB statuses). */
export type CustomerOrderStepId = 'accepted' | 'with_courier' | 'delivered';

export type CustomerOrderStep = {
  id: CustomerOrderStepId;
  title: string;
  description: string;
};

export const CUSTOMER_ORDER_STEPS: CustomerOrderStep[] = [
  {
    id: 'accepted',
    title: 'Buyurtma qabul qilindi',
    description: 'Buyurtmangiz muvaffaqiyatli qabul qilindi.',
  },
  {
    id: 'with_courier',
    title: 'Buyurtmangizni kuryer oldi',
    description: 'Kuryer buyurtmangiz bilan yo‘lga chiqdi.',
  },
  {
    id: 'delivered',
    title: 'Buyurtma yetkazildi',
    description: 'Xaridingiz uchun rahmat.',
  },
];

/** Active step index: 0–2 in progress, 3 = all complete. */
export function customerProgressStepIndex(status: OrderStatusLite): number {
  switch (status) {
    case 'PENDING_SCHEDULE':
    case 'NEW':
      return 0;
    case 'PICKING':
    case 'READY':
      return 1;
    case 'DELIVERING':
      return 2;
    case 'DELIVERED':
      return 3;
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
}

export function customerOrderStatusLabel(status: OrderStatusLite): string {
  switch (status) {
    case 'PENDING_SCHEDULE':
      return 'Yetkazish rejalashtirildi';
    case 'NEW':
      return 'Buyurtma yuborildi';
    case 'PICKING':
    case 'READY':
      return CUSTOMER_ORDER_STEPS[0].title;
    case 'DELIVERING':
      return CUSTOMER_ORDER_STEPS[1].title;
    case 'DELIVERED':
      return CUSTOMER_ORDER_STEPS[2].title;
    case 'CANCELLED':
      return 'Buyurtma bekor qilindi';
    default:
      return 'Holat';
  }
}

export function customerOrderProgressPercent(status: OrderStatusLite): number {
  const idx = customerProgressStepIndex(status);
  if (idx < 0) return 0;
  if (idx >= 3) return 100;
  return Math.round(((idx + 0.35) / 3) * 100);
}

export function isActiveCustomerOrder(status: OrderStatusLite): boolean {
  return (
    status === 'PENDING_SCHEDULE' ||
    status === 'NEW' ||
    status === 'PICKING' ||
    status === 'READY' ||
    status === 'DELIVERING'
  );
}
