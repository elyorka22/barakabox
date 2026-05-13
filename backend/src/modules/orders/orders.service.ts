import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CartService } from '../cart/cart.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { OrderStatus, Prisma, UnitType } from '@prisma/client';

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PICKING', 'CANCELLED'],
  PICKING: ['READY', 'CANCELLED'],
  READY: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly queueService: QueueService,
    private readonly events: EventEmitterService,
    private readonly configService: ConfigService,
  ) {}

  async createFromCart(
    userId: string,
    deliveryInfo?: { name?: string; phone?: string; address?: string },
  ) {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const normalizedItems = cart.items.map((item) => {
      if (item.variant) {
        const unitType = (item.variant.product?.unit ?? 'dona') as UnitType;
        return {
          type: 'variant' as const,
          entityId: item.variant.id,
          productId: item.variant.productId,
          title: item.variant.title || item.product?.name || 'Variant',
          flavor: item.variant.flavor ?? null,
          size: item.variant.size ?? null,
          sku: item.variant.sku ?? null,
          price: Number(item.variant.discountPrice ?? item.variant.price),
          quantity: item.quantity,
          unitType,
        };
      }
      if (item.product) {
        return {
          type: 'product' as const,
          entityId: item.product.id,
          productId: item.product.id,
          title: item.product.name,
          flavor: null,
          size: null,
          sku: null,
          price: Number(item.product.price),
          quantity: item.quantity,
          unitType: (item.product.unit ?? 'dona') as UnitType,
        };
      }
      if (item.box) {
        return {
          type: 'box' as const,
          entityId: item.box.id,
          title: item.box.name,
          price: Number(item.box.price),
          quantity: item.quantity,
          unitType: 'dona' as UnitType,
        };
      }
      throw new BadRequestException('Invalid cart item');
    });

    const idempotencyKey = createHash('sha256')
      .update(`${userId}:${JSON.stringify(normalizedItems)}`)
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

    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const threshold = Number(this.configService.get('FREE_DELIVERY_THRESHOLD') ?? 30);
    const deliveryFeeValue = Number(this.configService.get('DELIVERY_FEE') ?? 3);
    const deliveryFee = subtotal >= threshold ? 0 : deliveryFeeValue;
    const total = subtotal + deliveryFee;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          customerName: deliveryInfo?.name?.trim() || user.fullName,
          customerPhone: deliveryInfo?.phone?.trim() || 'N/A',
          deliveryAddress: deliveryInfo?.address?.trim() || 'N/A',
          idempotencyKey,
          subtotalAmount: subtotal,
          deliveryFee,
          totalAmount: total,
          items: {
            create: normalizedItems.map((item) => ({
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
            })),
          },
        },
        include: { items: true },
      });

      for (const item of normalizedItems) {
        if (item.type !== 'product' && item.type !== 'variant') {
          continue;
        }
        const productId = item.productId;
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

  private async applyStatus(orderId: string, nextStatus: OrderStatus, actor: { role: 'PICKER' | 'COURIER' | 'ADMIN'; userId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const currentStatus = order.status;
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

  listPickerQueue() {
    return this.prisma.order.findMany({
      where: { status: { in: ['NEW', 'PICKING'] } },
      include: { items: { include: { product: true, variant: true } }, user: true, assignedPicker: true, assignedCourier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listCourierQueue() {
    return this.prisma.order.findMany({
      where: { status: 'READY' },
      include: { items: { include: { product: true, variant: true } }, user: true, assignedPicker: true, assignedCourier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.order.findMany({
      include: { items: { include: { product: true, variant: true } }, user: true, assignedPicker: true, assignedCourier: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
