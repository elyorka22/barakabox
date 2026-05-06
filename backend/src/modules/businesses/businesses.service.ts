import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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
      this.prisma.product.aggregate({ where: { businessId: business.id }, _sum: { stock: true } }),
      this.prisma.orderItem.aggregate({
        where: { product: { businessId: business.id }, order: { status: 'COMPLETED' } },
        _sum: { quantity: true },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { businessId: business.id }, order: { status: 'COMPLETED' } },
        select: { quantity: true, unitPrice: true },
      }),
      this.prisma.order.count({
        where: { status: 'COMPLETED', items: { some: { product: { businessId: business.id } } } },
      }),
    ]);

    const totalRevenue = completedItems.reduce((sum, item) => {
      return sum + Number(item.unitPrice) * item.quantity;
    }, 0);

    return {
      totalProducts,
      activeProducts,
      totalStock: stockAgg._sum.stock ?? 0,
      soldUnits: soldAgg._sum.quantity ?? 0,
      totalRevenue,
      completedOrders: ordersCount,
    };
  }
}
