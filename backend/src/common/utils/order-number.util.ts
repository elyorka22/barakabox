import { randomBytes } from 'crypto';
import {
  ORDER_NUMBER_CHARSET,
  ORDER_NUMBER_LENGTH,
  formatOrderNumberLabel,
  normalizeOrderNumber,
  displayOrderNumber,
} from '../../../../shared/order-number';
import type { PrismaService } from '../../infrastructure/database/prisma.service';

export { formatOrderNumberLabel, normalizeOrderNumber, displayOrderNumber };

export function generateOrderNumber(): string {
  const len = ORDER_NUMBER_CHARSET.length;
  let out = '';
  const bytes = randomBytes(ORDER_NUMBER_LENGTH);
  for (let i = 0; i < ORDER_NUMBER_LENGTH; i += 1) {
    out += ORDER_NUMBER_CHARSET[bytes[i]! % len]!;
  }
  return out;
}

export async function generateUniqueOrderNumber(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const orderNumber = generateOrderNumber();
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (!existing) return orderNumber;
  }
  throw new Error('Failed to generate unique order number');
}

export function orderNumberSearchVariants(q: string): string[] {
  const norm = normalizeOrderNumber(q);
  if (!norm) return [];
  return [norm];
}
