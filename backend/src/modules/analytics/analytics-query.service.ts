import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { getTashkentParts } from '../../common/delivery/scheduled-delivery.util';
import { AnalyticsRealtimeService } from './analytics-realtime.service';

export type AnalyticsPeriod = 'day' | 'week' | 'month';

type Range = { start: Date; end: Date; prevStart: Date; prevEnd: Date };

@Injectable()
export class AnalyticsQueryService {
  private cache: { key: string; at: number; data: unknown } | null = null;
  private readonly cacheTtlMs = 45_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: AnalyticsRealtimeService,
  ) {}

  async getOverview(period: AnalyticsPeriod = 'week') {
    const cacheKey = `analytics:${period}`;
    if (this.cache && this.cache.key === cacheKey && Date.now() - this.cache.at < this.cacheTtlMs) {
      return this.cache.data;
    }

    const range = this.buildRange(period);
    const data = await this.buildOverview(range, period);
    this.cache = { key: cacheKey, at: Date.now(), data };
    return data;
  }

  async getRealtime() {
    const [onlineUsers, onlineSessions, recentOrders, todayRevenue] = await Promise.all([
      this.realtime.getOnlineCount(),
      this.realtime.getOnlineSessions(12),
      this.prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          customerName: true,
          createdAt: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: this.startOfDay(new Date()) },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    const activePickers = await this.prisma.order.groupBy({
      by: ['assignedPickerId'],
      where: {
        assignedPickerId: { not: null },
        status: { in: [OrderStatus.PICKING, OrderStatus.READY] },
      },
      _count: { _all: true },
    });

    const activeCouriers = await this.prisma.order.groupBy({
      by: ['assignedCourierId'],
      where: {
        assignedCourierId: { not: null },
        status: OrderStatus.DELIVERING,
      },
      _count: { _all: true },
    });

    return {
      onlineUsers,
      onlineSessions,
      liveOrders: recentOrders,
      todayOrders: todayRevenue._count._all,
      todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      activePickers: activePickers.length,
      activeCouriers: activeCouriers.length,
      at: new Date().toISOString(),
    };
  }

  private async buildOverview(range: Range, period: AnalyticsPeriod) {
    const eventWhere = { createdAt: { gte: range.start, lte: range.end } };
    const prevEventWhere = { createdAt: { gte: range.prevStart, lte: range.prevEnd } };

    const [
      pageViews,
      prevPageViews,
      sessions,
      prevSessions,
      registeredSessions,
      productViews,
      addToCart,
      checkouts,
      searches,
      onlineUsers,
      ordersAgg,
      prevOrdersAgg,
      scheduledCount,
      instantCount,
      topViewed,
      topAdded,
      funnelByDay,
      busiestHours,
      pickerPerf,
      courierPerf,
      avgDeliveryMs,
      topCategories,
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { ...eventWhere, name: 'page_view' } }),
      this.prisma.analyticsEvent.count({ where: { ...prevEventWhere, name: 'page_view' } }),
      this.prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: eventWhere,
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: prevEventWhere,
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: { ...eventWhere, userId: { not: null } },
      }),
      this.prisma.analyticsEvent.count({ where: { ...eventWhere, name: 'product_viewed' } }),
      this.prisma.analyticsEvent.count({ where: { ...eventWhere, name: 'product_added_to_cart' } }),
      this.prisma.analyticsEvent.count({ where: { ...eventWhere, name: 'checkout_started' } }),
      this.prisma.analyticsEvent.count({ where: { ...eventWhere, name: 'search_used' } }),
      this.realtime.getOnlineCount(),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: range.start, lte: range.end }, status: { not: OrderStatus.CANCELLED } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: range.prevStart, lte: range.prevEnd },
          status: { not: OrderStatus.CANCELLED },
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: range.start, lte: range.end },
          isScheduled: true,
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: range.start, lte: range.end },
          isScheduled: false,
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      this.topProductsByEvent('product_viewed', range.start, range.end),
      this.topProductsByEvent('product_added_to_cart', range.start, range.end),
      this.buildFunnelSeries(range, period),
      this.busiestOrderHours(range.start, range.end),
      this.staffPerformance('assignedPickerId', range.start, range.end),
      this.staffPerformance('assignedCourierId', range.start, range.end),
      this.averageDeliveryTime(range.start, range.end),
      this.topCategoriesFromOrders(range.start, range.end),
    ]);

    const uniqueVisitors = sessions.length;
    const prevUniqueVisitors = prevSessions.length;
    const registeredVisitors = registeredSessions.length;
    const anonymousVisitors = Math.max(0, uniqueVisitors - registeredVisitors);

    const orders = ordersAgg._count._all;
    const revenue = ordersAgg._sum.totalAmount ?? 0;
    const prevOrders = prevOrdersAgg._count._all;
    const prevRevenue = prevOrdersAgg._sum.totalAmount ?? 0;

    const conversionRate =
      uniqueVisitors > 0 ? Math.round((orders / uniqueVisitors) * 1000) / 10 : 0;
    const cartConversion =
      productViews > 0 ? Math.round((addToCart / productViews) * 1000) / 10 : 0;
    const checkoutConversion =
      checkouts > 0 ? Math.round((orders / checkouts) * 1000) / 10 : 0;

    return {
      period,
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      visitors: {
        pageViews,
        pageViewsGrowth: this.growth(pageViews, prevPageViews),
        uniqueVisitors,
        uniqueVisitorsGrowth: this.growth(uniqueVisitors, prevUniqueVisitors),
        registeredVisitors,
        anonymousVisitors,
        returningRate: this.estimateReturningRate(uniqueVisitors, registeredVisitors),
        onlineNow: onlineUsers,
      },
      behavior: {
        searches,
        avgPagesPerSession:
          uniqueVisitors > 0 ? Math.round((pageViews / uniqueVisitors) * 10) / 10 : 0,
        productViews,
        addToCart,
        checkouts,
        cartConversion,
        checkoutConversion,
      },
      ecommerce: {
        orders,
        ordersGrowth: this.growth(orders, prevOrders),
        revenue,
        revenueGrowth: this.growth(revenue, prevRevenue),
        conversionRate,
        scheduledOrders: scheduledCount,
        instantOrders: instantCount,
      },
      products: {
        topViewed,
        topAdded,
        topCategories,
      },
      delivery: {
        avgDeliveryMinutes: avgDeliveryMs ? Math.round(avgDeliveryMs / 60000) : null,
        busiestHours,
        pickerPerformance: pickerPerf,
        courierPerformance: courierPerf,
      },
      funnel: funnelByDay,
      errors: await this.errorSummary(range.start, range.end),
    };
  }

  private async topProductsByEvent(name: string, start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; title: string; cnt: bigint }>
    >`
      SELECT
        COALESCE(properties->>'productId', properties->>'variantId', 'unknown') AS product_id,
        COALESCE(MAX(properties->>'productName'), MAX(properties->>'title'), 'Mahsulot') AS title,
        COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE name = ${name}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
      GROUP BY 1
      ORDER BY cnt DESC
      LIMIT 8
    `;
    return rows.map((r) => ({
      productId: r.product_id,
      title: r.title,
      count: Number(r.cnt),
    }));
  }

  private async buildFunnelSeries(range: Range, period: AnalyticsPeriod) {
    const buckets = period === 'day' ? 24 : period === 'week' ? 7 : 30;
    const out: Array<{ label: string; views: number; carts: number; orders: number }> = [];
    const ms =
      period === 'day'
        ? 60 * 60 * 1000
        : period === 'week'
          ? 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    for (let i = buckets - 1; i >= 0; i -= 1) {
      const end = new Date(range.end.getTime() - i * ms);
      const start = new Date(end.getTime() - ms);
      const [views, carts, orders] = await Promise.all([
        this.prisma.analyticsEvent.count({
          where: { name: 'page_view', createdAt: { gte: start, lt: end } },
        }),
        this.prisma.analyticsEvent.count({
          where: { name: 'product_added_to_cart', createdAt: { gte: start, lt: end } },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: start, lt: end },
            status: { not: OrderStatus.CANCELLED },
          },
        }),
      ]);
      const tk = getTashkentParts(start);
      const label =
        period === 'day'
          ? `${String(tk.hour).padStart(2, '0')}:00`
          : `${tk.day}.${String(tk.month).padStart(2, '0')}`;
      out.push({ label, views, carts, orders });
    }
    return out;
  }

  private async busiestOrderHours(start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ hour: number; cnt: bigint }>>`
      SELECT EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Tashkent'))::int AS hour,
             COUNT(*)::bigint AS cnt
      FROM "Order"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND status <> 'CANCELLED'
      GROUP BY 1
      ORDER BY cnt DESC
      LIMIT 8
    `;
    return rows.map((r) => ({ hour: r.hour, orders: Number(r.cnt) }));
  }

  private async staffPerformance(
    field: 'assignedPickerId' | 'assignedCourierId',
    start: Date,
    end: Date,
  ) {
    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: start, lte: end },
      status: OrderStatus.DELIVERED,
      [field]: { not: null },
    };
    const grouped = await this.prisma.order.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    });
    const ids = grouped.map((g) => g[field]).filter(Boolean) as string[];
    if (!ids.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return grouped
      .map((g) => ({
        staffId: g[field],
        name: nameById.get(g[field] as string) ?? '—',
        completed: g._count._all,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 6);
  }

  private async averageDeliveryTime(start: Date, end: Date) {
    const rows = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: OrderStatus.DELIVERED,
        deliveredAt: { not: null },
      },
      select: { createdAt: true, deliveredAt: true },
      take: 500,
    });
    if (!rows.length) return null;
    const total = rows.reduce((sum, o) => {
      const ms = (o.deliveredAt!.getTime() - o.createdAt.getTime());
      return sum + ms;
    }, 0);
    return total / rows.length;
  }

  private async topCategoriesFromOrders(start: Date, end: Date) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: start, lte: end }, status: { not: OrderStatus.CANCELLED } },
        productId: { not: null },
      },
      select: {
        quantity: true,
        product: { select: { categoryId: true, category: { select: { name: true } } } },
      },
      take: 2000,
    });
    const map = new Map<string, { name: string; qty: number }>();
    for (const item of items) {
      const catId = item.product?.categoryId ?? 'other';
      const name = item.product?.category?.name ?? 'Boshqa';
      const row = map.get(catId) ?? { name, qty: 0 };
      row.qty += item.quantity;
      map.set(catId, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }

  private async errorSummary(start: Date, end: Date) {
    const [apiErrors, cartFails, frontendErrors, slow] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { name: 'api_error', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.analyticsEvent.count({
        where: { name: 'cart_action_failed', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.analyticsEvent.count({
        where: { name: 'frontend_error', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.analyticsEvent.count({
        where: { name: { in: ['slow_request', 'performance'] }, createdAt: { gte: start, lte: end } },
      }),
    ]);
    return { apiErrors, cartFails, frontendErrors, slowRequests: slow };
  }

  private estimateReturningRate(unique: number, registered: number): number {
    if (unique <= 0) return 0;
    return Math.min(100, Math.round((registered / unique) * 100));
  }

  private growth(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private buildRange(period: AnalyticsPeriod): Range {
    const end = new Date();
    const start = new Date(end);
    if (period === 'day') start.setHours(start.getHours() - 24);
    else if (period === 'week') start.setDate(start.getDate() - 7);
    else start.setMonth(start.getMonth() - 1);

    const span = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - span);
    return { start, end, prevStart, prevEnd };
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
}
