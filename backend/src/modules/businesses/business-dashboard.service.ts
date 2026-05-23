import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { isStoreOperatorRole, normalizeRole } from '../../common/roles';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StoreContextService } from '../marketplace/store-context.service';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PICKING,
  OrderStatus.READY,
  OrderStatus.DELIVERING,
];

const businessOrderWhere = (businessId: string): Prisma.OrderWhereInput => ({
  items: {
    some: {
      OR: [
        { product: { businessId } },
        { variant: { product: { businessId } } },
      ],
    },
  },
});

@Injectable()
export class BusinessDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeContext: StoreContextService,
  ) {}

  async requireBusiness(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || !isStoreOperatorRole(user.role)) {
      throw new ForbiddenException('Biznes profili topilmadi');
    }

    let business;
    if (normalizeRole(user.role) === 'STORE_OWNER') {
      const businessId = await this.storeContext.resolveBusinessProfileId(userId, user.role);
      business = await this.prisma.businessProfile.findUnique({
        where: { id: businessId },
        include: { user: { select: { id: true, email: true, staffLogin: true, phone: true, fullName: true } } },
      });
    } else {
      business = await this.prisma.businessProfile.findUnique({
        where: { userId },
        include: { user: { select: { id: true, email: true, staffLogin: true, phone: true, fullName: true } } },
      });
    }

    if (!business) {
      throw new ForbiddenException('Biznes profili topilmadi');
    }
    if (business.status !== 'APPROVED' || !business.isActive) {
      throw new ForbiddenException('Biznes tasdiqlanmagan yoki o‘chirilgan');
    }
    return business;
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  async getDashboard(userId: string) {
    const business = await this.requireBusiness(userId);
    const businessId = business.id;
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const monthStart = this.startOfMonth(now);
    const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const orderScope = businessOrderWhere(businessId);
    const notCancelled: Prisma.OrderWhereInput = { status: { not: OrderStatus.CANCELLED } };

    const [
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      todayOrders,
      todayRevenueAgg,
      pendingOrders,
      monthOrders,
      prevMonthOrders,
      topProducts,
      dailySeries,
      recentOrders,
      deliveredItems,
      deliveredOrderCustomers,
    ] = await Promise.all([
      this.prisma.product.count({ where: { businessId } }),
      this.prisma.product.count({ where: { businessId, isActive: true } }),
      this.prisma.product.findMany({
        where: { businessId, isActive: true, stockQuantity: { gt: 0, lte: 5 } },
        select: { id: true, name: true, stockQuantity: true, unit: true },
        take: 12,
        orderBy: { stockQuantity: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { businessId, isActive: true, stockQuantity: { lte: 0 } },
        select: { id: true, name: true, stockQuantity: true, unit: true },
        take: 12,
      }),
      this.prisma.order.count({
        where: { ...orderScope, createdAt: { gte: todayStart }, ...notCancelled },
      }),
      this.prisma.order.aggregate({
        where: {
          ...orderScope,
          createdAt: { gte: todayStart },
          status: OrderStatus.DELIVERED,
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          ...orderScope,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
      }),
      this.prisma.order.count({
        where: { ...orderScope, createdAt: { gte: monthStart }, ...notCancelled },
      }),
      this.prisma.order.count({
        where: {
          ...orderScope,
          createdAt: { gte: prevMonthStart, lt: monthStart },
          ...notCancelled,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          product: { businessId },
          order: { status: OrderStatus.DELIVERED, createdAt: { gte: monthStart } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 8,
      }),
      this.buildDailySeries(businessId, weekStart, todayStart),
      this.prisma.order.findMany({
        where: orderScope,
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          customerName: true,
          customerPhone: true,
          addressLabel: true,
          createdAt: true,
          items: {
            where: {
              OR: [
                { product: { businessId } },
                { variant: { product: { businessId } } },
              ],
            },
            select: {
              quantity: true,
              price: true,
              product: { select: { name: true } },
              variant: { select: { flavor: true, title: true } },
            },
          },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: { businessId },
          order: { status: OrderStatus.DELIVERED },
        },
        select: { quantity: true, price: true, order: { select: { customerId: true, userId: true } } },
      }),
      this.prisma.order.findMany({
        where: { ...orderScope, status: OrderStatus.DELIVERED },
        select: { customerId: true, userId: true },
      }),
    ]);

    const customerCounts = new Map<string, number>();
    for (const o of deliveredOrderCustomers) {
      const key = o.customerId ? `c:${o.customerId}` : o.userId ? `u:${o.userId}` : '';
      if (!key) continue;
      customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1);
    }
    const repeatCustomers = [...customerCounts.values()].filter((n) => n > 1).length;

    const productIds = topProducts.map((r) => r.productId).filter(Boolean) as string[];
    const productNames = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, unit: true },
        })
      : [];
    const nameById = new Map(productNames.map((p) => [p.id, p]));

    const todayRevenue = Number(todayRevenueAgg._sum.totalAmount ?? 0);
    const monthGrowth =
      prevMonthOrders > 0
        ? Math.round(((monthOrders - prevMonthOrders) / prevMonthOrders) * 100)
        : monthOrders > 0
          ? 100
          : 0;

    const totalRevenue = deliveredItems.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0,
    );
    const completedOrders = await this.prisma.order.count({
      where: { ...orderScope, status: OrderStatus.DELIVERED },
    });
    const averageOrderValue =
      completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

    return {
      business: {
        id: business.id,
        displayName: business.displayName,
        phone: business.phone,
        address: business.address,
        description: business.description,
        logoUrl: business.logoUrl,
        status: business.status,
        login: business.user.staffLogin,
      },
      kpis: {
        todayOrders,
        todayRevenue,
        totalProducts,
        activeProducts,
        pendingOrders,
        averageOrderValue,
        repeatCustomers,
        monthOrders,
        monthGrowthPercent: monthGrowth,
        totalRevenue,
        completedOrders,
      },
      inventory: {
        lowStock,
        outOfStock,
      },
      topProducts: topProducts.map((row) => {
        const p = nameById.get(row.productId ?? '');
        return {
          productId: row.productId,
          name: p?.name ?? 'Mahsulot',
          unit: p?.unit ?? 'dona',
          soldQuantity: row._sum.quantity ?? 0,
        };
      }),
      dailySales: dailySeries,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        addressLabel: o.addressLabel,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items,
      })),
    };
  }

  private async buildDailySeries(businessId: string, from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...businessOrderWhere(businessId),
        createdAt: { gte: from, lte: new Date(to.getTime() + 86400000) },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { createdAt: true, totalAmount: true, status: true },
    });

    const buckets = new Map<string, { date: string; orders: number; revenue: number }>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, orders: 0, revenue: 0 });
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      b.orders += 1;
      if (o.status === OrderStatus.DELIVERED) {
        b.revenue += Number(o.totalAmount);
      }
    }
    return [...buckets.values()];
  }

  async getProfile(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { userId },
      include: { user: { select: { staffLogin: true, email: true, phone: true } } },
    });
    if (!business) throw new NotFoundException('Biznes topilmadi');
    return {
      id: business.id,
      displayName: business.displayName,
      phone: business.phone ?? business.user.phone,
      address: business.address,
      description: business.description,
      logoUrl: business.logoUrl,
      status: business.status,
      isActive: business.isActive,
      login: business.user.staffLogin,
      email: business.user.email,
    };
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    phone?: string | null;
    address?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  }) {
    const business = await this.requireBusiness(userId);
    return this.prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        ...(data.displayName !== undefined ? { displayName: data.displayName.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl?.trim() || null } : {}),
      },
    });
  }
}
