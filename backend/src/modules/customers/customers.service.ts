import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  VIP_MIN_ORDERS,
  VIP_MIN_SPENT,
  canLinkCustomerFromPhone,
  classifyCustomerLoyalty,
  loyaltyFilterWhere,
  normalizeCustomerPhone,
  type CustomerLoyaltyTier,
} from './customers.utils';
import type { CreateCustomerAddressDto } from './dto/customer-address.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByPhoneOnOrder(
    phoneRaw: string,
    name: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const phone = normalizeCustomerPhone(phoneRaw);
    return tx.customer.upsert({
      where: { phone },
      create: { phone, name: name?.trim() || null },
      update: { ...(name?.trim() ? { name: name.trim() } : {}) },
    });
  }

  getBalanceByPhone(phoneRaw: string) {
    try {
      if (!canLinkCustomerFromPhone(phoneRaw)) {
        return Promise.resolve({ phone: null as string | null, cashbackBalanceTiyin: 0 });
      }
      const phone = normalizeCustomerPhone(phoneRaw);
      return this.prisma.customer.findUnique({ where: { phone } }).then((c) => ({
        phone,
        cashbackBalanceTiyin: c?.cashbackBalance ?? 0,
      }));
    } catch {
      return Promise.resolve({ phone: null as string | null, cashbackBalanceTiyin: 0 });
    }
  }

  /** @deprecated Use listForAdminPaginated — kept for backward compatibility */
  listForAdmin() {
    return this.listForAdminPaginated({ page: 1, limit: 500 }).then((r) => r.items);
  }

  async listForAdminPaginated(opts?: {
    page?: number;
    limit?: number;
    q?: string;
    sortBy?: 'totalSpent' | 'totalOrders' | 'cashbackBalance' | 'createdAt' | 'name' | 'phone' | 'lastOrderAt';
    sortDir?: 'asc' | 'desc';
    loyalty?: CustomerLoyaltyTier;
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 25));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();
    const sortBy = opts?.sortBy ?? 'totalSpent';
    const sortDir = opts?.sortDir === 'asc' ? 'asc' : 'desc';

    const where: Prisma.CustomerWhereInput = {};
    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (opts?.loyalty) {
      Object.assign(where, loyaltyFilterWhere(opts.loyalty));
    }

    if (sortBy === 'lastOrderAt') {
      return this.listCustomersSortedByLastOrder({ where, page, limit, skip, sortDir });
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortDir }
        : sortBy === 'phone'
          ? { phone: sortDir }
          : sortBy === 'totalOrders'
            ? { totalOrders: sortDir }
            : sortBy === 'cashbackBalance'
              ? { cashbackBalance: sortDir }
              : sortBy === 'createdAt'
                ? { createdAt: sortDir }
                : { totalSpent: sortDir };

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          phone: true,
          name: true,
          cashbackBalance: true,
          totalSpent: true,
          totalOrders: true,
          createdAt: true,
          orders: {
            where: { status: OrderStatus.DELIVERED },
            orderBy: { deliveredAt: 'desc' },
            take: 1,
            select: { deliveredAt: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: rows.map((c) => this.mapAdminCustomerRow(c)),
      total,
      page,
      limit,
    };
  }

  private mapAdminCustomerRow(c: {
    id: string;
    phone: string;
    name: string | null;
    cashbackBalance: number;
    totalSpent: number;
    totalOrders: number;
    createdAt: Date;
    orders: Array<{ deliveredAt: Date | null }>;
  }) {
    const lastOrderAt = c.orders[0]?.deliveredAt ?? null;
    const averageOrderAmount =
      c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0;
    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      cashbackBalance: c.cashbackBalance,
      totalSpent: c.totalSpent,
      totalOrders: c.totalOrders,
      averageOrderAmount,
      lastOrderAt: lastOrderAt ? lastOrderAt.toISOString() : null,
      loyaltyTier: classifyCustomerLoyalty(c.totalOrders, c.totalSpent),
      createdAt: c.createdAt.toISOString(),
    };
  }

  private async listCustomersSortedByLastOrder(params: {
    where: Prisma.CustomerWhereInput;
    page: number;
    limit: number;
    skip: number;
    sortDir: 'asc' | 'desc';
  }) {
    const rows = await this.prisma.customer.findMany({
      where: params.where,
      select: {
        id: true,
        phone: true,
        name: true,
        cashbackBalance: true,
        totalSpent: true,
        totalOrders: true,
        createdAt: true,
        orders: {
          where: { status: OrderStatus.DELIVERED },
          orderBy: { deliveredAt: 'desc' },
          take: 1,
          select: { deliveredAt: true },
        },
      },
    });

    const dir = params.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const ta = a.orders[0]?.deliveredAt?.getTime() ?? 0;
      const tb = b.orders[0]?.deliveredAt?.getTime() ?? 0;
      if (ta !== tb) return (ta - tb) * dir;
      return (b.totalSpent - a.totalSpent) * dir;
    });

    const total = rows.length;
    const pageRows = rows.slice(params.skip, params.skip + params.limit);

    return {
      items: pageRows.map((c) => this.mapAdminCustomerRow(c)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async getAdminCustomerStats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      returningCustomers,
      orderAgg,
      topBySpent,
      topByOrders,
      activeThisMonth,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { totalOrders: { gte: 2 } } }),
      this.prisma.customer.aggregate({
        _avg: { totalOrders: true },
        _sum: { totalSpent: true, totalOrders: true },
      }),
      this.prisma.customer.findMany({
        orderBy: { totalSpent: 'desc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          name: true,
          totalSpent: true,
          totalOrders: true,
        },
      }),
      this.prisma.customer.findMany({
        where: { totalOrders: { gte: 2 } },
        orderBy: { totalOrders: 'desc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          name: true,
          totalSpent: true,
          totalOrders: true,
        },
      }),
      this.prisma.customer.count({
        where: {
          orders: {
            some: {
              status: OrderStatus.DELIVERED,
              deliveredAt: { gte: monthStart },
            },
          },
        },
      }),
    ]);

    const totalOrdersSum = Number(orderAgg._sum.totalOrders ?? 0);
    const repeatOrderRate =
      totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 1000) / 10 : 0;
    const returningPercent = repeatOrderRate;
    const avgOrdersPerCustomer =
      totalCustomers > 0
        ? Math.round((totalOrdersSum / totalCustomers) * 100) / 100
        : 0;

    const vipCount = await this.prisma.customer.count({
      where: {
        OR: [{ totalOrders: { gte: VIP_MIN_ORDERS } }, { totalSpent: { gte: VIP_MIN_SPENT } }],
      },
    });

    return {
      totalCustomers,
      returningCustomers,
      returningPercent,
      repeatOrderRate,
      avgOrdersPerCustomer,
      totalRevenue: Number(orderAgg._sum.totalSpent ?? 0),
      vipCount,
      activeThisMonth,
      topBySpent: topBySpent.map((c) => ({
        ...c,
        loyaltyTier: classifyCustomerLoyalty(c.totalOrders, c.totalSpent),
      })),
      topByOrders: topByOrders.map((c) => ({
        ...c,
        loyaltyTier: classifyCustomerLoyalty(c.totalOrders, c.totalSpent),
      })),
    };
  }

  listTransactionsForAdmin() {
    return this.prisma.cashbackTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        customer: { select: { phone: true, name: true } },
        order: { select: { id: true, status: true, totalAmount: true } },
      },
    });
  }

  async listAddressesByPhone(phoneRaw: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) return [];
    return this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createCustomerAddress(dto: CreateCustomerAddressDto) {
    const phone = normalizeCustomerPhone(dto.phone);
    const lat = dto.latitude;
    const lng = dto.longitude;
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });

    const siblings = await this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      select: { id: true, latitude: true, longitude: true },
    });
    const duplicate = siblings.find(
      (a) => Math.abs(a.latitude - lat) < 0.00015 && Math.abs(a.longitude - lng) < 0.00015,
    );
    if (duplicate) {
      throw new BadRequestException('Bu joylashuv allaqachon saqlangan');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: dto.label.trim(),
        address: dto.address?.trim() ?? '',
        latitude: lat,
        longitude: lng,
        isDefault: Boolean(dto.isDefault),
      },
    });
  }

  async deleteCustomerAddress(phoneRaw: string, addressId: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    return { ok: true };
  }

  async setDefaultCustomerAddress(phoneRaw: string, addressId: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');
    await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      }),
      this.prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);
    return this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }
}
