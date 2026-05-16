import { BadRequestException } from '@nestjs/common';
import type { CashbackType } from '@prisma/client';

export function normalizeCustomerPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) {
    throw new BadRequestException('Telefon raqami noto‘g‘ri');
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return digits;
  }
  if (digits.length > 12 && digits.startsWith('998')) {
    return digits.slice(0, 12);
  }
  if (digits.length >= 10) {
    return digits;
  }
  throw new BadRequestException('Telefon raqami noto‘g‘ri');
}

export function canLinkCustomerFromPhone(phone?: string | null): boolean {
  if (!phone || !phone.trim() || phone.trim().toUpperCase() === 'N/A') return false;
  return /\d/.test(phone);
}

export type CustomerLoyaltyTier = 'NEW' | 'RETURNING' | 'LOYAL' | 'VIP';

export const VIP_MIN_ORDERS = 10;
export const VIP_MIN_SPENT = 5_000_000;
const LOYAL_MIN_ORDERS = 5;
const RETURNING_MIN_ORDERS = 2;

/** Single loyalty badge — highest matching tier wins. */
export function classifyCustomerLoyalty(totalOrders: number, totalSpent: number): CustomerLoyaltyTier {
  if (totalOrders >= VIP_MIN_ORDERS || totalSpent >= VIP_MIN_SPENT) return 'VIP';
  if (totalOrders >= LOYAL_MIN_ORDERS) return 'LOYAL';
  if (totalOrders >= RETURNING_MIN_ORDERS) return 'RETURNING';
  return 'NEW';
}

export function loyaltyFilterWhere(tier: CustomerLoyaltyTier): Record<string, unknown> {
  switch (tier) {
    case 'VIP':
      return { OR: [{ totalOrders: { gte: VIP_MIN_ORDERS } }, { totalSpent: { gte: VIP_MIN_SPENT } }] };
    case 'LOYAL':
      return {
        totalOrders: { gte: LOYAL_MIN_ORDERS, lt: VIP_MIN_ORDERS },
        totalSpent: { lt: VIP_MIN_SPENT },
      };
    case 'RETURNING':
      return {
        totalOrders: { gte: RETURNING_MIN_ORDERS, lt: LOYAL_MIN_ORDERS },
      };
    case 'NEW':
    default:
      return { totalOrders: { lt: RETURNING_MIN_ORDERS } };
  }
}

export function cashbackPendingForLine(lineSubtotalTiyin: number, type: CashbackType, value: number): number {
  if (lineSubtotalTiyin <= 0 || type === 'NONE' || value <= 0) return 0;
  if (type === 'PERCENT') {
    const p = Math.min(100, Math.max(0, value));
    return Math.floor((lineSubtotalTiyin * p) / 100);
  }
  if (type === 'FIXED_AMOUNT') {
    return Math.min(lineSubtotalTiyin, value);
  }
  return 0;
}
