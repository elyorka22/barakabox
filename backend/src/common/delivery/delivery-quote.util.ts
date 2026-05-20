export type DeliverySettings = {
  deliveryPrice: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
};

export type DeliveryQuote = {
  subtotalAmount: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  remainingForFreeDelivery: number;
  totalAmount: number;
};

export function defaultDeliverySettings(): DeliverySettings {
  return {
    deliveryPrice: Number(process.env.DELIVERY_FEE ?? 15000),
    freeDeliveryEnabled: true,
    freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD ?? 350000),
  };
}

export function calculateDeliveryQuote(
  subtotalAmount: number,
  settings: DeliverySettings,
): DeliveryQuote {
  const subtotal = Math.max(0, Math.floor(subtotalAmount));
  const deliveryPrice = Math.max(0, Math.floor(settings.deliveryPrice));
  const threshold = Math.max(0, Math.floor(settings.freeDeliveryThreshold));

  let deliveryFee = deliveryPrice;
  let isFreeDelivery = false;

  if (settings.freeDeliveryEnabled && subtotal >= threshold) {
    deliveryFee = 0;
    isFreeDelivery = true;
  }

  const remainingForFreeDelivery =
    settings.freeDeliveryEnabled && !isFreeDelivery ? Math.max(0, threshold - subtotal) : 0;

  return {
    subtotalAmount: subtotal,
    deliveryFee,
    isFreeDelivery,
    remainingForFreeDelivery,
    totalAmount: subtotal + deliveryFee,
  };
}
