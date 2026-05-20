import { api } from '@/lib/api';

/** @deprecated Legacy type — single delivery mode only. */
export type DeliverySpeed = 'STANDARD';

export type DeliveryConfig = {
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

const ENV_DEFAULTS: DeliveryConfig = {
  deliveryPrice: Number(process.env.NEXT_PUBLIC_DELIVERY_FEE ?? 15000),
  freeDeliveryEnabled: true,
  freeDeliveryThreshold: Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD ?? 350000),
};

export function computeDeliveryQuote(subtotalAmount: number, config: DeliveryConfig): DeliveryQuote {
  const subtotal = Math.max(0, Math.floor(subtotalAmount));
  const deliveryPrice = Math.max(0, Math.floor(config.deliveryPrice));
  const threshold = Math.max(0, Math.floor(config.freeDeliveryThreshold));

  let deliveryFee = deliveryPrice;
  let isFreeDelivery = false;

  if (config.freeDeliveryEnabled && subtotal >= threshold) {
    deliveryFee = 0;
    isFreeDelivery = true;
  }

  const remainingForFreeDelivery =
    config.freeDeliveryEnabled && !isFreeDelivery ? Math.max(0, threshold - subtotal) : 0;

  return {
    subtotalAmount: subtotal,
    deliveryFee,
    isFreeDelivery,
    remainingForFreeDelivery,
    totalAmount: subtotal + deliveryFee,
  };
}

let configCache: DeliveryConfig | null = null;
let configPromise: Promise<DeliveryConfig> | null = null;

export async function fetchDeliveryConfig(force = false): Promise<DeliveryConfig> {
  if (!force && configCache) return configCache;
  if (!force && configPromise) return configPromise;

  configPromise = api
    .get<DeliveryConfig>('/settings/delivery')
    .then((data) => {
      configCache = data;
      return data;
    })
    .catch(() => {
      configCache = ENV_DEFAULTS;
      return ENV_DEFAULTS;
    });

  return configPromise;
}

export function invalidateDeliveryConfigCache() {
  configCache = null;
  configPromise = null;
}

/** @deprecated Use computeDeliveryQuote with fetched config. */
export function deliveryFeeFor(_speed: DeliverySpeed, subtotal: number, config?: DeliveryConfig): number {
  const cfg = config ?? ENV_DEFAULTS;
  return computeDeliveryQuote(subtotal, cfg).deliveryFee;
}
