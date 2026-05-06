import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerBusiness(userId: string, displayName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'BUSINESS') {
      throw new ForbiddenException('Only business users can register');
    }

    return this.prisma.businessProfile.upsert({
      where: { userId },
      create: { userId, displayName, status: 'PENDING' },
      update: { displayName, status: 'PENDING' },
    });
  }

  listPending() {
    return this.prisma.businessProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
    });
  }

  listApproved() {
    return this.prisma.businessProfile.findMany({
      where: { status: 'APPROVED' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.businessProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createByAdmin(data: { userId: string; displayName: string; phone?: string }) {
    return this.prisma.businessProfile.create({
      data: {
        userId: data.userId,
        displayName: data.displayName,
        phone: data.phone,
        status: 'APPROVED',
        isActive: true,
      },
    });
  }

  async createInlineByAdmin(data: { name: string; phone?: string }) {
    const emailPrefix = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'business';
    const email = `${emailPrefix}-${Date.now()}@barakabox.local`;
    const passwordHash = await bcrypt.hash('change-me-123', 10);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: data.name.trim(),
          role: 'BUSINESS',
          passwordHash,
        },
      });
      return tx.businessProfile.create({
        data: {
          userId: user.id,
          displayName: data.name.trim(),
          phone: data.phone?.trim() || null,
          status: 'APPROVED',
          isActive: true,
        },
        include: { user: true },
      });
    });
  }

  updateByAdmin(id: string, data: { displayName?: string; phone?: string; isActive?: boolean }) {
    return this.prisma.businessProfile.update({
      where: { id },
      data,
    });
  }

  removeByAdmin(id: string) {
    return this.prisma.businessProfile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  approve(businessId: string) {
    return this.prisma.businessProfile.update({
      where: { id: businessId },
      data: { status: 'APPROVED' },
    });
  }

  async getMyStats(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { userId },
    });
    if (!business) {
      throw new ForbiddenException('Business profile not found');
    }

    const [totalProducts, activeProducts, stockAgg, soldAgg, completedItems, ordersCount] = await Promise.all([
      this.prisma.product.count({ where: { businessId: business.id } }),
      this.prisma.product.count({ where: { businessId: business.id, isActive: true } }),
      this.prisma.product.aggregate({ where: { businessId: business.id }, _sum: { stockQuantity: true } }),
      this.prisma.orderItem.aggregate({
        where: { product: { businessId: business.id }, order: { status: 'DELIVERED' } },
        _sum: { quantity: true },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { businessId: business.id }, order: { status: 'DELIVERED' } },
        select: { quantity: true, price: true },
      }),
      this.prisma.order.count({
        where: { status: 'DELIVERED', items: { some: { product: { businessId: business.id } } } },
      }),
    ]);

    const totalRevenue = completedItems.reduce((sum, item) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);

    return {
      totalProducts,
      activeProducts,
      totalStock: stockAgg._sum.stockQuantity ?? 0,
      soldUnits: soldAgg._sum.quantity ?? 0,
      totalRevenue,
      completedOrders: ordersCount,
    };
  }
}
