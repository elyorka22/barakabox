import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CustomersService } from '../customers/customers.service';

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

type Range = { start: Date; end: Date; prevStart: Date; prevEnd: Date };

@Injectable()
export class AdminDashboardService {
  private cache: { key: string; at: number; data: unknown } | null = null;
  private readonly cacheTtlMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {}

  async getDashboard(period: DashboardPeriod = 'month') {
    const cacheKey = `dashboard:${period}`;
    if (this.cache && this.cache.key === cacheKey && Date.now() - this.cache.at < this.cacheTtlMs) {
      return this.cache.data;
    }

    const range = this.buildRange(period);
    const todayStart = this.startOfDay(new Date());

    const [
      lifetimeOrders,
      lifetimeRevenue,
      activeProducts,
      periodOrders,
      prevPeriodOrders,
      todayOrders,
      todayRevenue,
      statusBreakdown,
      customerStats,
      timeSeries,
      topProducts,
      topCategories,
      lowStock,
      outOfStock,
      districts,
      couriers,
      categoryBreakdown,
      recentOrders,
      pendingCount,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: { not: OrderStatus.CANCELLED } } }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: { totalAmount: true },
      }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.aggregateOrdersInRange(range.start, range.end),
      this.aggregateOrdersInRange(range.prevStart, range.prevEnd),
      this.aggregateOrdersInRange(todayStart, range.end),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.start, lte: range.end } },
        _count: { _all: true },
      }),
      this.customersService.getAdminCustomerStats(),
      this.buildTimeSeries(period, range.start, range.end),
      this.buildTopProducts(range.start, range.end, range.prevStart, range.prevEnd),
      this.buildTopCategories(range.start, range.end),
      this.buildLowStock(),
      this.buildOutOfStock(),
      this.buildDistricts(range.start, range.end),
      this.buildCourierStats(range.start, range.end),
      this.buildCategoryAnalytics(range.start, range.end),
      this.prisma.order.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          customerName: true,
          createdAt: true,
          addressLabel: true,
        },
      }),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.NEW, OrderStatus.PICKING, OrderStatus.READY, OrderStatus.DELIVERING] },
        },
      }),
    ]);

    const totalRevenue = Number(lifetimeRevenue._sum.totalAmount ?? 0);
    const periodRevenue = periodOrders.revenue;
    const periodOrderCount = periodOrders.count;
    const prevRevenue = prevPeriodOrders.revenue;
    const prevOrderCount = prevPeriodOrders.count;

    const deliveredInPeriod =
      statusBreakdown.find((s) => s.status === OrderStatus.DELIVERED)?._count._all ?? 0;
    const totalInPeriod = statusBreakdown.reduce((sum, s) => sum + s._count._all, 0);
    const deliveredPercent =
      totalInPeriod > 0 ? Math.round((deliveredInPeriod / totalInPeriod) * 1000) / 10 : 0;

    const averageOrderValue =
      periodOrderCount > 0 ? Math.round(periodRevenue / periodOrderCount) : 0;

    const payload = {
      period,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalOrders: lifetimeOrders,
        totalRevenue,
        averageOrderValue,
        activeCustomers: customerStats.totalCustomers,
        repeatCustomerPercent: customerStats.returningPercent,
        deliveredPercent,
        pendingOrders: pendingCount,
        todayRevenue: Number(todayRevenue._sum.totalAmount ?? 0),
        todayOrders: todayOrders.count,
        activeProducts,
        growth: {
          ordersPercent: this.growthPercent(periodOrderCount, prevOrderCount),
          revenuePercent: this.growthPercent(periodRevenue, prevRevenue),
          aovPercent: this.growthPercent(
            averageOrderValue,
            prevOrderCount > 0 ? Math.round(prevRevenue / prevOrderCount) : 0,
          ),
        },
      },
      timeSeries,
      topProducts,
      topCategories,
      fastGrowingProducts: topProducts
        .filter((p) => p.growthPercent > 0)
        .sort((a, b) => b.growthPercent - a.growthPercent)
        .slice(0, 5),
      inventory: {
        lowStock,
        outOfStock,
      },
      customers: {
        totalCustomers: customerStats.totalCustomers,
        returningPercent: customerStats.returningPercent,
        repeatOrderRate: customerStats.repeatOrderRate,
        avgOrdersPerCustomer: customerStats.avgOrdersPerCustomer,
        activeThisMonth: customerStats.activeThisMonth,
        topBySpent: customerStats.topBySpent,
        topByOrders: customerStats.topByOrders,
      },
      districts,
      couriers,
      categories: categoryBreakdown,
      recentActivity: recentOrders.map((o) => ({
        id: o.id,
        type: 'order' as const,
        status: o.status,
        message: `${o.customerName} · ${o.totalAmount.toLocaleString('uz-UZ')} so'm`,
        district: o.addressLabel,
        createdAt: o.createdAt.toISOString(),
      })),
    };

    this.cache = { key: cacheKey, at: Date.now(), data: payload };
    return payload;
  }

  private buildRange(period: DashboardPeriod): Range {
    const end = new Date();
    const start = new Date(end);
    const prevEnd = new Date(start);
    const prevStart = new Date(start);

    if (period === 'day') {
      start.setDate(start.getDate() - 29);
      prevEnd.setDate(prevEnd.getDate() - 30);
      prevStart.setDate(prevStart.getDate() - 59);
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7 * 11);
      prevEnd.setTime(start.getTime());
      prevStart.setDate(prevStart.getDate() - 7 * 12);
    } else if (period === 'year') {
      start.setFullYear(start.getFullYear() - 4);
      start.setMonth(0, 1);
      prevEnd.setTime(start.getTime());
      prevStart.setFullYear(prevStart.getFullYear() - 5);
    } else {
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      prevEnd.setTime(start.getTime());
      prevStart.setMonth(prevStart.getMonth() - 12);
    }

    return { start, end, prevStart, prevEnd };
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private growthPercent(current: number, previous: number) {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async aggregateOrdersInRange(start: Date, end: Date) {
    const agg = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: OrderStatus.CANCELLED },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    return {
      count: agg._count._all,
      revenue: Number(agg._sum.totalAmount ?? 0),
    };
  }

  private async buildTimeSeries(period: DashboardPeriod, start: Date, end: Date) {
    const trunc =
      period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'year' ? 'year' : 'month';

    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; orders: bigint; revenue: bigint; delivered: bigint }>
    >`
      SELECT date_trunc(${trunc}, o."createdAt") AS bucket,
             COUNT(*)::bigint AS orders,
             COALESCE(SUM(o."totalAmount"), 0)::bigint AS revenue,
             COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::bigint AS delivered
      FROM "Order" o
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND o.status != 'CANCELLED'
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((r) => {
      const orders = Number(r.orders);
      const revenue = Number(r.revenue);
      const delivered = Number(r.delivered);
      return {
        label: this.formatBucketLabel(r.bucket, period),
        date: r.bucket.toISOString(),
        orders,
        revenue,
        avgBasket: orders > 0 ? Math.round(revenue / orders) : 0,
        deliverySuccessRate: orders > 0 ? Math.round((delivered / orders) * 1000) / 10 : 0,
      };
    });
  }

  private formatBucketLabel(d: Date, period: DashboardPeriod) {
    if (period === 'day') {
      return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
    }
    if (period === 'week') {
      return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
    }
    if (period === 'year') {
      return String(d.getFullYear());
    }
    return d.toLocaleDateString('uz-UZ', { month: 'short', year: '2-digit' });
  }

  private async buildTopProducts(
    start: Date,
    end: Date,
    prevStart: Date,
    prevEnd: Date,
  ) {
    const current = await this.prisma.$queryRaw<
      Array<{ product_id: string; qty: bigint; revenue: bigint }>
    >`
      SELECT oi."productId" AS product_id,
             SUM(oi.quantity)::bigint AS qty,
             SUM(oi.price * oi.quantity)::bigint AS revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED'
        AND o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND oi."productId" IS NOT NULL
      GROUP BY oi."productId"
      ORDER BY qty DESC
      LIMIT 10
    `;

    const previous = await this.prisma.$queryRaw<
      Array<{ product_id: string; qty: bigint }>
    >`
      SELECT oi."productId" AS product_id,
             SUM(oi.quantity)::bigint AS qty
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED'
        AND o."createdAt" >= ${prevStart}
        AND o."createdAt" < ${prevEnd}
        AND oi."productId" IS NOT NULL
      GROUP BY oi."productId"
    `;

    const prevMap = new Map(previous.map((p) => [p.product_id, Number(p.qty)]));
    const ids = current.map((r) => r.product_id);
    if (ids.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        unit: true,
        imageThumbUrl: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return current.map((row) => {
      const p = byId.get(row.product_id);
      const qty = Number(row.qty);
      const prevQty = prevMap.get(row.product_id) ?? 0;
      return {
        productId: row.product_id,
        name: p?.name ?? 'Mahsulot',
        categoryName: p?.category?.name ?? null,
        imageUrl: p?.imageThumbUrl ?? p?.imageUrl ?? null,
        quantitySold: qty,
        revenue: Number(row.revenue),
        growthPercent: this.growthPercent(qty, prevQty),
        remainingStock: p?.stockQuantity ?? 0,
        unit: p?.unit ?? 'dona',
      };
    });
  }

  private async buildTopCategories(start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ category_id: string | null; category_name: string | null; qty: bigint; revenue: bigint }>
    >`
      SELECT p."categoryId" AS category_id,
             c.name AS category_name,
             SUM(oi.quantity)::bigint AS qty,
             SUM(oi.price * oi.quantity)::bigint AS revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      LEFT JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE o.status = 'DELIVERED'
        AND o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
      GROUP BY p."categoryId", c.name
      ORDER BY revenue DESC
      LIMIT 8
    `;

    return rows.map((r) => ({
      categoryId: r.category_id,
      name: r.category_name ?? 'Boshqa',
      quantitySold: Number(r.qty),
      revenue: Number(r.revenue),
    }));
  }

  private async buildLowStock() {
    return this.prisma.product.findMany({
      where: { isActive: true, stockQuantity: { gt: 0, lte: 5 } },
      orderBy: { stockQuantity: 'asc' },
      take: 15,
      select: { id: true, name: true, stockQuantity: true, unit: true, imageThumbUrl: true, imageUrl: true },
    });
  }

  private async buildOutOfStock() {
    return this.prisma.product.findMany({
      where: { isActive: true, stockQuantity: { lte: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      select: { id: true, name: true, stockQuantity: true, unit: true, imageThumbUrl: true, imageUrl: true },
    });
  }

  private async buildDistricts(start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ label: string; orders: bigint; revenue: bigint }>
    >`
      SELECT
        COALESCE(NULLIF(TRIM(o."addressLabel"), ''), SPLIT_PART(o."deliveryAddress", ',', 1), 'Noma''lum hudud') AS label,
        COUNT(*)::bigint AS orders,
        SUM(o."totalAmount")::bigint AS revenue
      FROM "Order" o
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND o.status <> 'CANCELLED'
      GROUP BY 1
      ORDER BY orders DESC
      LIMIT 10
    `;

    return rows.map((r) => ({
      label: String(r.label).slice(0, 48),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }

  private districtLabel(addressLabel: string | null, deliveryAddress: string) {
    if (addressLabel?.trim()) return addressLabel.trim();
    const part = deliveryAddress.split(',')[0]?.trim();
    return part && part.length > 0 ? part.slice(0, 48) : 'Noma\'lum hudud';
  }

  private async buildCourierStats(start: Date, end: Date) {
    const couriers = await this.prisma.user.findMany({
      where: { role: 'COURIER', isActive: true },
      select: { id: true, fullName: true },
    });

    const stats = await Promise.all(
      couriers.map(async (c) => {
        const [delivered, failed, revenueAgg] = await Promise.all([
          this.prisma.order.count({
            where: {
              assignedCourierId: c.id,
              status: OrderStatus.DELIVERED,
              deliveredAt: { gte: start, lte: end },
            },
          }),
          this.prisma.courierOrderReject.count({
            where: { courierId: c.id, createdAt: { gte: start, lte: end } },
          }),
          this.prisma.order.aggregate({
            where: {
              assignedCourierId: c.id,
              status: OrderStatus.DELIVERED,
              deliveredAt: { gte: start, lte: end },
            },
            _sum: { totalAmount: true },
          }),
        ]);
        return {
          id: c.id,
          name: c.fullName,
          completedDeliveries: delivered,
          failedDeliveries: failed,
          revenueDelivered: Number(revenueAgg._sum.totalAmount ?? 0),
        };
      }),
    );

    return stats.sort((a, b) => b.completedDeliveries - a.completedDeliveries).slice(0, 10);
  }

  private async buildCategoryAnalytics(start: Date, end: Date) {
    const top = await this.buildTopCategories(start, end);
    const highestVolume = [...top].sort((a, b) => b.quantitySold - a.quantitySold)[0] ?? null;
    const highestRevenue = top[0] ?? null;
    const slowest = [...top].sort((a, b) => a.quantitySold - b.quantitySold)[0] ?? null;
    return {
      items: top,
      highestVolume,
      highestRevenue,
      slowest,
    };
  }
}
