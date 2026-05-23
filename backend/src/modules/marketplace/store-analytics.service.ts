import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StoreCatalogService } from './store-catalog.service';
import type { StoreAnalyticsPeriod } from './dto/store-analytics.dto';

type Range = { start: Date; end: Date; prevStart: Date; prevEnd: Date };

const NOT_CANCELLED: Prisma.OrderWhereInput = { status: { not: OrderStatus.CANCELLED } };

function businessOrderWhere(businessId: string): Prisma.OrderWhereInput {
  return {
    items: {
      some: {
        OR: [
          { product: { businessId } },
          { variant: { product: { businessId } } },
        ],
      },
    },
  };
}

function storeEventScope(storeId: string, storeSlug: string): Prisma.AnalyticsEventWhereInput {
  return {
    OR: [
      { properties: { path: ['storeId'], equals: storeId } },
      { properties: { path: ['storeSlug'], equals: storeSlug } },
      {
        AND: [{ name: 'page_view' }, { path: { contains: `/stores/${storeSlug}` } }],
      },
      { name: 'store_viewed', properties: { path: ['storeId'], equals: storeId } },
    ],
  };
}

@Injectable()
export class StoreAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeCatalog: StoreCatalogService,
  ) {}

  async getAnalyticsForOperator(userId: string, role: string, period: StoreAnalyticsPeriod = 'week') {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    return this.getStoreAnalytics(store.id, period);
  }

  async getStoreAnalytics(storeId: string, period: StoreAnalyticsPeriod = 'week') {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        businessProfileId: true,
      },
    });
    if (!store) throw new NotFoundException('Do‘kon topilmadi');

    const range = this.buildRange(period);
    const scope = storeEventScope(store.id, store.slug);
    const periodWhere = { createdAt: { gte: range.start, lte: range.end } };
    const prevWhere = { createdAt: { gte: range.prevStart, lte: range.prevEnd } };

    const eventWhere = { AND: [scope, periodWhere] };
    const prevEventWhere = { AND: [scope, prevWhere] };

    const [
      visitorSessions,
      prevVisitorSessions,
      productViews,
      prevProductViews,
      addToCart,
      checkouts,
      searches,
      topViewedRows,
      dailySeries,
      orderStats,
      prevOrderStats,
      topSoldRows,
    ] = await Promise.all([
      this.countUniqueSessions({ AND: [scope, periodWhere] }),
      this.countUniqueSessions({ AND: [scope, prevWhere] }),
      this.prisma.analyticsEvent.count({
        where: { ...eventWhere, name: 'product_viewed' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...prevEventWhere, name: 'product_viewed' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...eventWhere, name: 'product_added_to_cart' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...eventWhere, name: 'checkout_started' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...eventWhere, name: 'search_used' },
      }),
      this.topViewedProducts(store.id, store.slug, range.start, range.end),
      this.buildOrderDailySeries(store.id, store.businessProfileId, range.start, range.end),
      this.orderKpis(store.id, store.businessProfileId, range.start, range.end),
      this.orderKpis(store.id, store.businessProfileId, range.prevStart, range.prevEnd),
      this.topSoldProducts(store.businessProfileId, range.start, range.end),
    ]);

    const visitors = visitorSessions;
    const orders = orderStats.orderCount;
    const revenue = orderStats.revenue;
    const conversionRate =
      visitors > 0 ? Math.round((orders / visitors) * 1000) / 10 : orders > 0 ? 100 : 0;

    return {
      store: { id: store.id, name: store.name, slug: store.slug },
      period,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      kpis: {
        visitors,
        visitorsGrowth: this.growth(visitors, prevVisitorSessions),
        productViews,
        productViewsGrowth: this.growth(productViews, prevProductViews),
        addToCart,
        checkouts,
        searches,
        orders,
        ordersGrowth: this.growth(orders, prevOrderStats.orderCount),
        revenue,
        revenueGrowth: this.growth(revenue, prevOrderStats.revenue),
        deliveredOrders: orderStats.deliveredCount,
        conversionRate,
        averageOrderValue: orderStats.averageOrderValue,
      },
      funnel: [
        { step: 'visitors', count: visitors },
        { step: 'product_views', count: productViews },
        { step: 'add_to_cart', count: addToCart },
        { step: 'checkout', count: checkouts },
        { step: 'orders', count: orders },
      ],
      topProducts: this.mergeTopProducts(topSoldRows, topViewedRows),
      dailySales: dailySeries,
      note: null,
    };
  }

  async getPlatformAnalytics(period: StoreAnalyticsPeriod = 'week') {
    const range = this.buildRange(period);
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, businessProfileId: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    const topStores = await Promise.all(
      stores.map(async (store) => {
        const scope = storeEventScope(store.id, store.slug);
        const periodWhere = { createdAt: { gte: range.start, lte: range.end } };
        const [visitors, productViews, orders] = await Promise.all([
          this.countUniqueSessions({ AND: [scope, periodWhere] }),
          this.prisma.analyticsEvent.count({
            where: { AND: [scope, periodWhere], name: 'product_viewed' },
          }),
          this.prisma.order.count({
            where: {
              ...this.orderScopeForStore(store.id, store.businessProfileId),
              ...NOT_CANCELLED,
              createdAt: { gte: range.start, lte: range.end },
            },
          }),
        ]);
        const revenue = await this.orderRevenue(
          store.id,
          store.businessProfileId,
          range.start,
          range.end,
        );
        return {
          storeId: store.id,
          name: store.name,
          slug: store.slug,
          visitors,
          productViews,
          orders,
          revenue,
        };
      }),
    );

    topStores.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

    const totals = topStores.reduce(
      (acc, row) => ({
        visitors: acc.visitors + row.visitors,
        productViews: acc.productViews + row.productViews,
        orders: acc.orders + row.orders,
        revenue: acc.revenue + row.revenue,
      }),
      { visitors: 0, productViews: 0, orders: 0, revenue: 0 },
    );

    return {
      period,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      totals,
      topStores: topStores.slice(0, 20),
    };
  }

  private async countUniqueSessions(where: Prisma.AnalyticsEventWhereInput) {
    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { ...where, name: { in: ['page_view', 'store_viewed', 'product_viewed'] } },
    });
    return rows.length;
  }

  private orderScopeForStore(
    storeId: string,
    businessProfileId: string | null,
  ): Prisma.OrderWhereInput {
    const parts: Prisma.OrderWhereInput[] = [{ storeId }];
    if (businessProfileId) {
      parts.push(businessOrderWhere(businessProfileId));
    }
    return parts.length === 1 ? parts[0] : { OR: parts };
  }

  private async orderKpis(
    storeId: string,
    businessProfileId: string | null,
    start: Date,
    end: Date,
  ) {
    const scope = this.orderScopeForStore(storeId, businessProfileId);
    const created = { gte: start, lte: end };
    const [orderCount, deliveredCount, revenueAgg] = await Promise.all([
      this.prisma.order.count({
        where: { ...scope, ...NOT_CANCELLED, createdAt: created },
      }),
      this.prisma.order.count({
        where: { ...scope, status: OrderStatus.DELIVERED, createdAt: created },
      }),
      this.prisma.order.aggregate({
        where: { ...scope, status: OrderStatus.DELIVERED, createdAt: created },
        _sum: { totalAmount: true },
      }),
    ]);
    const revenue = Number(revenueAgg._sum.totalAmount ?? 0);
    const averageOrderValue = deliveredCount > 0 ? Math.round(revenue / deliveredCount) : 0;
    return { orderCount, deliveredCount, revenue, averageOrderValue };
  }

  private async orderRevenue(
    storeId: string,
    businessProfileId: string | null,
    start: Date,
    end: Date,
  ) {
    const agg = await this.prisma.order.aggregate({
      where: {
        ...this.orderScopeForStore(storeId, businessProfileId),
        status: OrderStatus.DELIVERED,
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount ?? 0);
  }

  private async buildOrderDailySeries(
    storeId: string,
    businessProfileId: string | null,
    start: Date,
    end: Date,
  ) {
    const scope = this.orderScopeForStore(storeId, businessProfileId);
    const orders = await this.prisma.order.findMany({
      where: {
        ...scope,
        createdAt: { gte: start, lte: end },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { createdAt: true, totalAmount: true, status: true },
    });

    const buckets = new Map<string, { date: string; orders: number; revenue: number }>();
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.set(key, { date: key, orders: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      if (o.status === OrderStatus.DELIVERED) {
        bucket.revenue += o.totalAmount;
      }
    }

    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  private async topSoldProducts(businessProfileId: string | null, start: Date, end: Date) {
    if (!businessProfileId) return [];

    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: { businessId: businessProfileId },
        order: {
          status: OrderStatus.DELIVERED,
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });

    const ids = rows.map((r) => r.productId).filter(Boolean) as string[];
    const products = ids.length
      ? await this.prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return rows.map((r) => ({
      productId: r.productId,
      name: nameById.get(r.productId ?? '') ?? 'Mahsulot',
      soldQuantity: r._sum.quantity ?? 0,
      views: 0,
    }));
  }

  private async topViewedProducts(storeId: string, storeSlug: string, start: Date, end: Date) {
    const rows = await this.prisma.analyticsEvent.findMany({
      where: {
        name: 'product_viewed',
        createdAt: { gte: start, lte: end },
        ...storeEventScope(storeId, storeSlug),
      },
      select: { properties: true },
      take: 8000,
      orderBy: { createdAt: 'desc' },
    });

    const counts = new Map<string, { key: string; name: string; views: number }>();
    for (const row of rows) {
      const props = row.properties as Record<string, unknown> | null;
      if (!props || typeof props !== 'object') continue;
      const listingId = typeof props.listingId === 'string' ? props.listingId : '';
      const productId = typeof props.productId === 'string' ? props.productId : '';
      const name =
        typeof props.productName === 'string' ? props.productName : productId || listingId || '?';
      const key = listingId || productId || name;
      const prev = counts.get(key);
      if (prev) prev.views += 1;
      else counts.set(key, { key, name, views: 1 });
    }

    return [...counts.values()]
      .sort((a, b) => b.views - a.views)
      .slice(0, 8)
      .map((r) => ({
        productId: r.key,
        name: r.name,
        soldQuantity: 0,
        views: r.views,
      }));
  }

  private mergeTopProducts(
    sold: Array<{ productId: string | null; name: string; soldQuantity: number; views: number }>,
    viewed: Array<{ productId: string | null; name: string; soldQuantity: number; views: number }>,
  ) {
    const map = new Map<
      string,
      { productId: string | null; name: string; soldQuantity: number; views: number }
    >();

    for (const row of [...sold, ...viewed]) {
      const key = row.productId ?? row.name;
      const prev = map.get(key);
      if (prev) {
        prev.soldQuantity = Math.max(prev.soldQuantity, row.soldQuantity);
        prev.views = Math.max(prev.views, row.views);
        if (row.soldQuantity > prev.soldQuantity) prev.name = row.name;
      } else {
        map.set(key, { ...row });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.soldQuantity - a.soldQuantity || b.views - a.views)
      .slice(0, 10);
  }

  private growth(current: number, previous: number) {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private buildRange(period: StoreAnalyticsPeriod): Range {
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
}
