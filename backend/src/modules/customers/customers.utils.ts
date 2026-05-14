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
