import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OrderScopeService } from '../orders/order-scope.service';
import { StoreCatalogService } from '../marketplace/store-catalog.service';
import {
  formatExactScheduleLabel,
  formatSlotLabel,
  getTashkentDateTimeParts,
  parseDateTimeSlotKey,
  parseSlotKey,
} from '../../common/delivery/scheduled-delivery.util';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PENDING_SCHEDULE,
  OrderStatus.PICKING,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
];

const storeOrderListSelect = {
  id: true,
  orderNumber: true,
  status: true,
  totalAmount: true,
  subtotalAmount: true,
  deliveryFee: true,
  customerName: true,
  customerPhone: true,
  deliveryAddress: true,
  addressLabel: true,
  createdAt: true,
  isScheduled: true,
  scheduledAt: true,
  deliverySlot: true,
  pickingAt: true,
  readyAt: true,
  deliveringAt: true,
  deliveredAt: true,
  cancelledAt: true,
  assignedPicker: { select: { id: true, fullName: true } },
  assignedCourier: { select: { id: true, fullName: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

@Injectable()
export class StorePanelOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeCatalog: StoreCatalogService,
    private readonly orderScope: OrderScopeService,
  ) {}

  private deliverySlotLabel(
    deliverySlot: string | null | undefined,
    scheduledAt?: Date | null,
  ): string | null {
    if (scheduledAt) {
      const parts = getTashkentDateTimeParts(scheduledAt);
      return formatExactScheduleLabel(parts.dateKey, parts.hour, parts.minute);
    }
    if (!deliverySlot) return null;
    const exact = parseDateTimeSlotKey(deliverySlot);
    if (exact) {
      return formatExactScheduleLabel(exact.dateKey, exact.hour, exact.minute);
    }
    const parsed = parseSlotKey(deliverySlot);
    if (!parsed) return null;
    return formatSlotLabel(parsed.dateKey, parsed.startHm, parsed.endHm);
  }

  private async resolveScope(userId: string, role: string) {
    try {
      const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
      return this.orderScope.orderWhereForStore(store.id);
    } catch {
      const bp = await this.prisma.businessProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!bp) {
        throw new ForbiddenException('Do‘kon yoki biznes profili topilmadi');
      }
      return this.orderScope.businessOrderWhere(bp.id);
    }
  }

  private buildTimeline(order: {
    status: OrderStatus;
    createdAt: Date;
    pickingAt: Date | null;
    readyAt: Date | null;
    deliveringAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
  }) {
    const steps = [
      { key: 'placed', label: 'Qabul qilindi', at: order.createdAt, done: true },
      { key: 'picking', label: 'Yig‘ilmoqda', at: order.pickingAt, done: Boolean(order.pickingAt) },
      { key: 'ready', label: 'Tayyor', at: order.readyAt, done: Boolean(order.readyAt) },
      { key: 'delivering', label: 'Yetkazilmoqda', at: order.deliveringAt, done: Boolean(order.deliveringAt) },
      { key: 'delivered', label: 'Yetkazildi', at: order.deliveredAt, done: order.status === 'DELIVERED' },
    ];
    if (order.status === 'CANCELLED') {
      steps.push({ key: 'cancelled', label: 'Bekor qilindi', at: order.cancelledAt, done: true });
    }
    return steps;
  }

  async getSummary(userId: string, role: string) {
    const scope = await this.resolveScope(userId, role);
    const baseWhere: Prisma.OrderWhereInput = { AND: [scope] };

    const [active, picking, ready, delivering, deliveredToday] = await Promise.all([
      this.prisma.order.count({
        where: { ...baseWhere, status: { in: ACTIVE_STATUSES } },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, status: OrderStatus.PICKING },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, status: OrderStatus.READY },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, status: OrderStatus.DELIVERING },
      }),
      this.prisma.order.count({
        where: {
          ...baseWhere,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: this.startOfDay(new Date()) },
        },
      }),
    ]);

    return {
      active,
      picking,
      ready,
      delivering,
      deliveredToday,
    };
  }

  async listOrders(
    userId: string,
    role: string,
    opts?: { page?: number; limit?: number; status?: OrderStatus; q?: string },
  ) {
    const scope = await this.resolveScope(userId, role);
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 30));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();

    const where: Prisma.OrderWhereInput = { AND: [scope] };
    if (opts?.status) where.status = opts.status;
    if (q) {
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { orderNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: storeOrderListSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        addressLabel: order.addressLabel,
        createdAt: order.createdAt,
        isScheduled: order.isScheduled,
        deliverySlotLabel: this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
        itemCount: order._count.items,
        pickerName: order.assignedPicker?.fullName ?? null,
        courierName: order.assignedCourier?.fullName ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getOrder(userId: string, role: string, orderId: string) {
    const scope = await this.resolveScope(userId, role);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, AND: [scope] },
      select: {
        ...storeOrderListSelect,
        deliveryNote: true,
        items: {
          select: {
            id: true,
            title: true,
            quantity: true,
            price: true,
            variantSnapshotTitle: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    return {
      ...order,
      deliverySlotLabel: this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
      itemCount: order.items.length,
      pickerName: order.assignedPicker?.fullName ?? null,
      courierName: order.assignedCourier?.fullName ?? null,
      timeline: this.buildTimeline(order),
    };
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
}
