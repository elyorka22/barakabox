import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CartService } from '../cart/cart.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { OrderStatus, Prisma } from '@prisma/client';

const FINAL_ORDER_STATUSES: OrderStatus[] = ['REJECTED', 'COMPLETED'];
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['DELIVERING', 'REJECTED'],
  DELIVERING: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
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

  async createFromCart(userId: string) {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const normalizedItems = cart.items.map((item) => {
      if (item.product) {
        return {
          type: 'product' as const,
          entityId: item.product.id,
          title: item.product.name,
          unitPrice: Number(item.product.price),
          quantity: item.quantity,
        };
      }
      if (item.box) {
        return {
          type: 'box' as const,
          entityId: item.box.id,
          title: item.box.name,
          unitPrice: Number(item.box.price),
          quantity: item.quantity,
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
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const threshold = Number(this.configService.get('FREE_DELIVERY_THRESHOLD') ?? 30);
    const deliveryFeeValue = Number(this.configService.get('DELIVERY_FEE') ?? 3);
    const deliveryFee = subtotal >= threshold ? 0 : deliveryFeeValue;
    const total = subtotal + deliveryFee;

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          idempotencyKey,
          subtotalAmount: subtotal,
          deliveryFee,
          totalAmount: total,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.type === 'product' ? item.entityId : null,
              boxId: item.type === 'box' ? item.entityId : null,
              title: item.title,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return createdOrder;
    });

    await this.queueService.enqueue('order.created', { orderId: order.id });
    this.events.emit('order.created', { orderId: order.id });

    return order;
  }

  async updateStatus(
    orderId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'DELIVERING' | 'COMPLETED',
    actorRole: 'BUSINESS' | 'COURIER',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const currentStatus = order.status;
    const nextStatus = status as OrderStatus;
    const allowedByRole: Record<'BUSINESS' | 'COURIER', OrderStatus[]> = {
      BUSINESS: ['ACCEPTED', 'REJECTED'],
      COURIER: ['DELIVERING', 'COMPLETED'],
    };
    if (!allowedByRole[actorRole].includes(nextStatus)) {
      throw new BadRequestException(`${actorRole} cannot set status to ${nextStatus}`);
    }
    const allowedStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];

    const isInvalidFinalTransition =
      FINAL_ORDER_STATUSES.includes(currentStatus) && currentStatus !== nextStatus;
    const isInvalidTransition = !allowedStatuses.includes(nextStatus);

    if (isInvalidFinalTransition || isInvalidTransition) {
      const message = `Invalid order status transition from ${currentStatus} to ${nextStatus}`;
      console.warn(`[OrdersService] ${message}`, { orderId });
      throw new BadRequestException(message);
    }

    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = { status: nextStatus };
    if (nextStatus === 'ACCEPTED') {
      updateData.acceptedAt = now;
    } else if (nextStatus === 'DELIVERING') {
      updateData.deliveringAt = now;
    } else if (nextStatus === 'COMPLETED') {
      updateData.completedAt = now;
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  listAll() {
    return this.prisma.order.findMany({
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
