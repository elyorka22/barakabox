import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { calculateCouponDiscount } from './coupon-discount.util';
import { normalizeCustomerPhone, canLinkCustomerFromPhone } from '../customers/customers.utils';
import type { CreateCouponDto, UpdateCouponDto } from './dto/create-coupon.dto';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateCouponDto) {
    const code = normalizeCode(dto.code);
    if (dto.discountType === 'PERCENT' && dto.discountValue > 100) {
      throw new BadRequestException('Foiz 100 dan oshmasligi kerak');
    }
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Bu kupon kodi allaqachon mavjud');
    }
    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscount: dto.maxDiscount ?? null,
        usageLimit: dto.usageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Kupon topilmadi');

    if (dto.discountType === 'PERCENT' && dto.discountValue != null && dto.discountValue > 100) {
      throw new BadRequestException('Foiz 100 dan oshmasligi kerak');
    }

    let code = coupon.code;
    if (dto.code) {
      code = normalizeCode(dto.code);
      if (code !== coupon.code) {
        const dup = await this.prisma.coupon.findUnique({ where: { code } });
        if (dup) throw new ConflictException('Bu kupon kodi allaqachon mavjud');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code ? { code } : {}),
        ...(dto.discountType ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue != null ? { discountValue: dto.discountValue } : {}),
        ...(dto.minOrderAmount != null ? { minOrderAmount: dto.minOrderAmount } : {}),
        ...(dto.maxDiscount !== undefined ? { maxDiscount: dto.maxDiscount } : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.perUserLimit != null ? { perUserLimit: dto.perUserLimit } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Kupon topilmadi');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  private assertCouponUsable(coupon: Coupon) {
    if (!coupon.isActive) {
      throw new BadRequestException('Kupon faol emas');
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Kupon muddati tugagan');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Kupon limiti tugagan');
    }
  }

  async validateForCheckout(input: {
    code: string;
    phone?: string;
    subtotalAmount: number;
    deliveryFee: number;
  }) {
    const code = normalizeCode(input.code);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new BadRequestException('Kupon topilmadi');
    }
    this.assertCouponUsable(coupon);

    const grossTotal = Math.max(0, input.subtotalAmount) + Math.max(0, input.deliveryFee);
    const discount = calculateCouponDiscount(coupon, input.subtotalAmount, grossTotal);
    if (discount <= 0) {
      throw new BadRequestException('Kupon ushbu buyurtmaga qo‘llanmaydi');
    }

    let phone: string | null = null;
    if (input.phone && canLinkCustomerFromPhone(input.phone)) {
      phone = normalizeCustomerPhone(input.phone);
      const usedByUser = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, phone },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new BadRequestException('Siz bu kupondan foydalana olmaysiz');
      }
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      couponDiscountTiyin: discount,
      grossTotal,
      totalAfterCoupon: Math.max(0, grossTotal - discount),
    };
  }

  async resolveForOrder(
    tx: Prisma.TransactionClient,
    input: {
      code?: string;
      phone?: string;
      subtotalAmount: number;
      deliveryFee: number;
    },
  ): Promise<{ couponId: string; couponCode: string; couponDiscountTiyin: number } | null> {
    if (!input.code?.trim()) return null;
    const code = normalizeCode(input.code);
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new BadRequestException('Kupon topilmadi');
    }
    this.assertCouponUsable(coupon);

    const grossTotal = Math.max(0, input.subtotalAmount) + Math.max(0, input.deliveryFee);
    const couponDiscountTiyin = calculateCouponDiscount(coupon, input.subtotalAmount, grossTotal);
    if (couponDiscountTiyin <= 0) {
      throw new BadRequestException('Kupon ushbu buyurtmaga qo‘llanmaydi');
    }

    let phone: string | null = null;
    let customerId: string | null = null;
    if (input.phone && canLinkCustomerFromPhone(input.phone)) {
      phone = normalizeCustomerPhone(input.phone);
      const customer = await tx.customer.findUnique({ where: { phone } });
      customerId = customer?.id ?? null;
      const usedByUser = await tx.couponRedemption.count({
        where: { couponId: coupon.id, phone },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new BadRequestException('Siz bu kupondan foydalana olmaysiz');
      }
    }

    if (coupon.usageLimit != null) {
      const updated = await tx.coupon.updateMany({
        where: { id: coupon.id, usedCount: { lt: coupon.usageLimit } },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Kupon limiti tugagan');
      }
    } else {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { couponId: coupon.id, couponCode: coupon.code, couponDiscountTiyin };
  }

  async attachRedemption(
    tx: Prisma.TransactionClient,
    input: {
      couponId: string;
      orderId: string;
      customerId?: string;
      phone?: string;
    },
  ) {
    await tx.couponRedemption.create({
      data: {
        couponId: input.couponId,
        orderId: input.orderId,
        customerId: input.customerId ?? null,
        phone: input.phone ?? null,
      },
    });
  }

  async refundCouponOnCancel(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { couponId: true },
    });
    if (!order?.couponId) return;
    await tx.couponRedemption.deleteMany({ where: { orderId } });
    await tx.coupon.update({
      where: { id: order.couponId },
      data: { usedCount: { decrement: 1 } },
    });
  }
}
