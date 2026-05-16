import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CartService } from '../cart/cart.service';
import { CustomersService } from '../customers/customers.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { OrderStatus, Prisma, UnitType } from '@prisma/client';
import {
  canLinkCustomerFromPhone,
  cashbackPendingForLine,
  normalizeCustomerPhone,
} from '../customers/customers.utils';

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PICKING', 'CANCELLED'],
  PICKING: ['READY', 'CANCELLED'],
  READY: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

type PreparedLine = {
  type: 'variant' | 'product' | 'box';
  entityId: string;
  productId: string | null;
  title: string;
  flavor: string | null;
  size: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  unitType: UnitType;
  cashbackPendingTiyin: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly customersService: CustomersService,
    private readonly queueService: QueueService,
    private readonly events: EventEmitterService,
    private readonly configService: ConfigService,
  ) {}

  async createFromCart(
    userId: string,
    deliveryInfo?: {
      name?: string;
      phone?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      manualAddress?: string;
      deliveryNote?: string;
      addressLabel?: string;
      deliverySpeed?: 'STANDARD' | 'EXPRESS';
      cashbackRedeemTiyin?: number;
    },
  ) {
    const latRaw = deliveryInfo?.latitude;
    const lngRaw = deliveryInfo?.longitude;
    const hasLat = latRaw !== undefined && latRaw !== null && Number.isFinite(latRaw);
    const hasLng = lngRaw !== undefined && lngRaw !== null && Number.isFinite(lngRaw);
    if (hasLat !== hasLng) {
      throw new BadRequestException('Koordinatalar to‘liq emas');
    }
    let lat: number | null = null;
    let lng: number | null = null;
    if (hasLat && hasLng) {
      const latNum = Number(latRaw);
      const lngNum = Number(lngRaw);
      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        throw new BadRequestException('Koordinatalar noto‘g‘ri');
      }
      lat = latNum;
      lng = lngNum;
    }
    const manualAddress = deliveryInfo?.manualAddress?.trim() || null;
    const addressText = deliveryInfo?.address?.trim() || '';
    if (!addressText) {
      throw new BadRequestException('Manzil majburiy');
    }
    if (!lat && !lng && !manualAddress) {
      throw new BadRequestException('Manzil yoki joylashuv koordinatasi kerak');
    }
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const preparedLines: PreparedLine[] = [];
    for (const item of cart.items) {
      if (item.variant) {
        const p = item.variant.product;
        const unitType = (p?.unit ?? 'dona') as UnitType;
        const price = Number(item.variant.discountPrice ?? item.variant.price);
        const quantity = item.quantity;
        const lineSubtotal = price * quantity;
        const pending = p
          ? cashbackPendingForLine(lineSubtotal, p.cashbackType, p.cashbackValue)
          : 0;
        preparedLines.push({
          type: 'variant',
          entityId: item.variant.id,
          productId: item.variant.productId,
          title: item.variant.title || item.product?.name || 'Variant',
          flavor: item.variant.flavor ?? null,
          size: item.variant.size ?? null,
          sku: item.variant.sku ?? null,
          price,
          quantity,
          unitType,
          cashbackPendingTiyin: pending,
        });
      } else if (item.product) {
        const p = item.product;
        const unitType = (p.unit ?? 'dona') as UnitType;
        const price = Number(p.price);
        const quantity = item.quantity;
        const lineSubtotal = price * quantity;
        const pending = cashbackPendingForLine(lineSubtotal, p.cashbackType, p.cashbackValue);
        preparedLines.push({
          type: 'product',
          entityId: item.product.id,
          productId: item.product.id,
          title: item.product.name,
          flavor: null,
          size: null,
          sku: null,
          price,
          quantity,
          unitType,
          cashbackPendingTiyin: pending,
        });
      } else if (item.box) {
        preparedLines.push({
          type: 'box',
          entityId: item.box.id,
          productId: null,
          title: item.box.name,
          flavor: null,
          size: null,
          sku: null,
          price: Number(item.box.price),
          quantity: item.quantity,
          unitType: 'dona' as UnitType,
          cashbackPendingTiyin: 0,
        });
      } else {
        throw new BadRequestException('Invalid cart item');
      }
    }

    const cashbackRedeemRequested = Math.max(0, Math.floor(deliveryInfo?.cashbackRedeemTiyin ?? 0));

    const idempotencyKey = createHash('sha256')
      .update(`${userId}:${cashbackRedeemRequested}:${JSON.stringify(preparedLines)}`)
      .digest('hex');

    const duplicateWindowSeconds = Number(
      this.configService.get('ORDER_IDEMPOTENCY_WINDOW_SECONDS') ?? 120,
    );
    const duplicateSince = new Date(Date.now() - duplicateWindowSeconds * 1000);

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        idempotencyKey,
        createdAt: { gte: duplicateSince },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existingOrder) {
      throw new ConflictException('Duplicate order attempt detected');
    }

    const subtotal = preparedLines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const threshold = Number(this.configService.get('FREE_DELIVERY_THRESHOLD') ?? 30000);
    const deliveryFeeValue = Number(this.configService.get('DELIVERY_FEE') ?? 3000);
    const expressDeliveryFee = Number(this.configService.get('EXPRESS_DELIVERY_FEE') ?? 15000);
    const speed = deliveryInfo?.deliverySpeed === 'EXPRESS' ? 'EXPRESS' : 'STANDARD';
    const deliveryFee =
      speed === 'EXPRESS'
        ? expressDeliveryFee
        : subtotal >= threshold
          ? 0
          : deliveryFeeValue;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const customerPhone = deliveryInfo?.phone?.trim() || 'N/A';
    const canLink = canLinkCustomerFromPhone(deliveryInfo?.phone);

    let redeem = cashbackRedeemRequested;
    if (redeem > subtotal) {
      redeem = subtotal;
    }

    const cashbackEarnedSnapshotTiyin = preparedLines.reduce((s, l) => s + l.cashbackPendingTiyin, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      if (canLink && deliveryInfo?.phone) {
        const customer = await this.customersService.upsertByPhoneOnOrder(
          deliveryInfo.phone,
          deliveryInfo.name,
          tx,
        );
        customerId = customer.id;
        if (redeem > 0) {
          const dec = await tx.customer.updateMany({
            where: { id: customer.id, cashbackBalance: { gte: redeem } },
            data: { cashbackBalance: { decrement: redeem } },
          });
          if (dec.count !== 1) {
            throw new BadRequestException('Keshbek balansi yetarli emas');
          }
        }
      } else if (redeem > 0) {
        throw new BadRequestException('Keshbek ishlatish uchun telefon raqam kiriting');
      } else {
        redeem = 0;
      }

      const totalAmount = Math.max(0, subtotal + deliveryFee - redeem);
      const trackingToken = randomBytes(24).toString('hex');

      const createdOrder = await tx.order.create({
        data: {
          trackingToken,
          userId,
          customerId,
          customerName: deliveryInfo?.name?.trim() || user.fullName,
          customerPhone,
          deliveryAddress: addressText,
          latitude: lat,
          longitude: lng,
          formattedAddress: deliveryInfo?.formattedAddress?.trim() || null,
          manualAddress,
          deliveryNote: deliveryInfo?.deliveryNote?.trim() || null,
          addressLabel: deliveryInfo?.addressLabel?.trim() || null,
          idempotencyKey,
          subtotalAmount: subtotal,
          deliveryFee,
          totalAmount,
          cashbackRedeemTiyin: redeem,
          cashbackEarnedSnapshotTiyin,
          items: {
            create: preparedLines.map((item) => ({
              productId: item.type === 'product' ? item.entityId : null,
              variantId: item.type === 'variant' ? item.entityId : null,
              boxId: item.type === 'box' ? item.entityId : null,
              unitType: item.unitType,
              title: item.title,
              variantSnapshotTitle: item.type === 'variant' ? item.title : null,
              variantSnapshotFlavor: item.type === 'variant' ? item.flavor : null,
              variantSnapshotSize: item.type === 'variant' ? item.size : null,
              variantSnapshotSku: item.type === 'variant' ? item.sku : null,
              quantity: item.quantity,
              price: item.price,
              cashbackPendingTiyin: item.cashbackPendingTiyin,
            })),
          },
        },
        include: { items: true },
      });

      if (redeem > 0 && customerId) {
        await tx.cashbackTransaction.create({
          data: {
            customerId,
            orderId: createdOrder.id,
            amount: redeem,
            type: 'SPENT',
            status: 'COMPLETED',
          },
        });
      }

      for (const item of preparedLines) {
        if (item.type !== 'product' && item.type !== 'variant') {
          continue;
        }
        const productId = item.productId;
        if (!productId) continue;
        if (item.type === 'variant') {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.entityId },
            select: { id: true, stock: true, isActive: true },
          });
          if (!variant || !variant.isActive) {
            throw new BadRequestException('Variant not found');
          }
          if (variant.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${item.title}`);
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: variant.stock - item.quantity },
          });
        } else {
          const product = await tx.product.findUnique({
            where: { id: item.entityId },
            select: { id: true, stockQuantity: true },
          });
          if (!product) {
            throw new BadRequestException('Product not found');
          }
          if (product.stockQuantity < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${item.title}`);
          }
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: product.stockQuantity - item.quantity },
          });
        }
        await tx.inventoryLog.create({
          data: {
            productId,
            orderId: createdOrder.id,
            change: -item.quantity,
            reason: 'SALE',
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return createdOrder;
    });

    await this.queueService.enqueue('order.created', { orderId: order.id });
    this.events.emit('order.created', { orderId: order.id });

    return order;
  }

  async getTrackByPhone(orderId: string, phoneRaw: string) {
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeCustomerPhone(phoneRaw);
    } catch {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        createdAt: true,
        customerPhone: true,
        deliveryAddress: true,
        cashbackEarnedSnapshotTiyin: true,
        cashbackCreditedAt: true,
        trackingToken: true,
        assignedCourier: { select: { fullName: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    let orderPhone = '';
    try {
      orderPhone = normalizeCustomerPhone(order.customerPhone);
    } catch {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (orderPhone !== normalizedPhone) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (!order.trackingToken) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const courierName = order.assignedCourier?.fullName?.trim() || null;
    return this.toPublicTrackPayload(order, courierName);
  }

  async getTrackByToken(tokenRaw: string) {
    const token = tokenRaw?.trim();
    if (!token || token.length < 16 || token.length > 128) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (!/^[a-f0-9]+$/i.test(token)) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const order = await this.prisma.order.findUnique({
      where: { trackingToken: token },
      select: {
        id: true,
        status: true,
        createdAt: true,
        deliveryAddress: true,
        cashbackEarnedSnapshotTiyin: true,
        cashbackCreditedAt: true,
        trackingToken: true,
        assignedCourier: { select: { fullName: true } },
      },
    });
    if (!order?.trackingToken) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const courierName = order.assignedCourier?.fullName?.trim() || null;
    return this.toPublicTrackPayload(order, courierName);
  }

  private toPublicTrackPayload(
    order: {
      status: OrderStatus;
      createdAt: Date;
      deliveryAddress: string;
      cashbackEarnedSnapshotTiyin: number;
      cashbackCreditedAt: Date | null;
      trackingToken: string | null;
    },
    courierName: string | null,
  ) {
    const trackingToken = order.trackingToken ?? '';
    const deliverySpeed = order.deliveryAddress.includes('Tezkor yetkazish') ? 'EXPRESS' : 'STANDARD';
    return {
      trackingToken,
      trackingCode: trackingToken ? trackingToken.slice(0, 8).toUpperCase() : '',
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      deliverySpeed,
      cashbackEarnedTiyin: order.cashbackEarnedSnapshotTiyin,
      cashbackCredited: Boolean(order.cashbackCreditedAt),
      courierName,
    };
  }

  private async finalizeDeliveredCashback(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        cashbackEarnedSnapshotTiyin: true,
        cashbackCreditedAt: true,
      },
    });
    if (!order?.customerId || order.cashbackCreditedAt) {
      return;
    }
    const earned = order.cashbackEarnedSnapshotTiyin;
    if (earned > 0) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          cashbackBalance: { increment: earned },
          totalSpent: { increment: order.totalAmount },
          totalOrders: { increment: 1 },
        },
      });
      await tx.cashbackTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          amount: earned,
          type: 'EARNED',
          status: 'COMPLETED',
        },
      });
    } else {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalSpent: { increment: order.totalAmount },
          totalOrders: { increment: 1 },
        },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { cashbackCreditedAt: new Date() },
    });
  }

  private async refundOrderCashbackSpend(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, cashbackRedeemTiyin: true },
    });
    if (!order?.customerId || !order.cashbackRedeemTiyin || order.cashbackRedeemTiyin <= 0) {
      return;
    }
    const amt = order.cashbackRedeemTiyin;
    await tx.customer.update({
      where: { id: order.customerId },
      data: { cashbackBalance: { increment: amt } },
    });
    await tx.cashbackTransaction.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        amount: amt,
        type: 'REFUND',
        status: 'COMPLETED',
      },
    });
  }

  private async applyStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actor: { role: 'PICKER' | 'COURIER' | 'ADMIN'; userId: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, assignedPickerId: true, assignedCourierId: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const currentStatus = order.status;
    if (actor.role === 'PICKER' && currentStatus === 'PICKING' && nextStatus === 'READY') {
      if (order.assignedPickerId !== actor.userId) {
        throw new ForbiddenException('Bu buyurtma sizga biriktirilmagan');
      }
    }
    if (actor.role === 'COURIER' && currentStatus === 'DELIVERING' && nextStatus === 'DELIVERED') {
      if (order.assignedCourierId !== actor.userId) {
        throw new ForbiddenException('Bu yetkazuv sizga biriktirilmagan');
      }
    }
    const allowedByRole: Record<'PICKER' | 'COURIER' | 'ADMIN', OrderStatus[]> = {
      PICKER: ['PICKING', 'READY'],
      COURIER: ['DELIVERING', 'DELIVERED'],
      ADMIN: ['PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'],
    };
    if (!allowedByRole[actor.role].includes(nextStatus)) {
      throw new BadRequestException(`${actor.role} cannot set status to ${nextStatus}`);
    }
    const allowedStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedStatuses.includes(nextStatus)) {
      const message = `Invalid order status transition from ${currentStatus} to ${nextStatus}`;
      console.warn(`[OrdersService] ${message}`, { orderId });
      throw new BadRequestException(message);
    }

    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = { status: nextStatus };
    if (nextStatus === 'PICKING') {
      updateData.pickingAt = now;
      updateData.assignedPicker = { connect: { id: actor.userId } };
    } else if (nextStatus === 'READY') {
      updateData.readyAt = now;
    } else if (nextStatus === 'DELIVERING') {
      updateData.deliveringAt = now;
      updateData.assignedCourier = { connect: { id: actor.userId } };
    } else if (nextStatus === 'DELIVERED') {
      updateData.deliveredAt = now;
    } else if (nextStatus === 'CANCELLED') {
      updateData.cancelledAt = now;
    }

    if (nextStatus === 'DELIVERED' || nextStatus === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });
        if (nextStatus === 'DELIVERED') {
          await this.finalizeDeliveredCashback(tx, orderId);
        }
        if (nextStatus === 'CANCELLED') {
          await this.refundOrderCashbackSpend(tx, orderId);
        }
        return updated;
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  async startPicking(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'PICKING', { role: 'PICKER', userId });
  }

  async setReady(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'READY', { role: 'PICKER', userId });
  }

  async startDelivery(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'DELIVERING', { role: 'COURIER', userId });
  }

  async setDelivered(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'DELIVERED', { role: 'COURIER', userId });
  }

  async cancelByAdmin(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'CANCELLED', { role: 'ADMIN', userId });
  }

  async setStatusByAdmin(orderId: string, status: OrderStatus, userId: string) {
    return this.applyStatus(orderId, status, { role: 'ADMIN', userId });
  }

  listPickerQueue(pickerUserId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ status: 'NEW' }, { status: 'PICKING', assignedPickerId: pickerUserId }],
      },
      include: {
        items: { include: { product: true, variant: true } },
        user: true,
        assignedPicker: true,
        assignedCourier: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listCourierQueue(courierUserId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ status: 'READY' }, { status: 'DELIVERING', assignedCourierId: courierUserId }],
      },
      include: {
        items: { include: { product: true, variant: true } },
        user: true,
        assignedPicker: true,
        assignedCourier: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForBusiness(businessProfileId: string) {
    return this.prisma.order.findMany({
      where: {
        items: {
          some: {
            OR: [
              { product: { businessId: businessProfileId } },
              { variant: { product: { businessId: businessProfileId } } },
            ],
          },
        },
      },
      include: {
        items: { include: { product: true, variant: true } },
        user: true,
        assignedPicker: true,
        assignedCourier: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForActor(userId: string, role: string) {
    const r = role.toUpperCase();
    if (r === 'ADMIN' || r === 'SUPER_ADMIN') {
      return this.listAll();
    }
    if (r === 'BUSINESS') {
      const bp = await this.prisma.businessProfile.findUnique({ where: { userId } });
      if (!bp) return [];
      return this.listForBusiness(bp.id);
    }
    throw new ForbiddenException('Buyurtmalar ro‘yxatiga ruxsat yo‘q');
  }

  listAll() {
    return this.prisma.order.findMany({
      include: {
        items: { include: { product: true, variant: true } },
        user: true,
        assignedPicker: true,
        assignedCourier: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
