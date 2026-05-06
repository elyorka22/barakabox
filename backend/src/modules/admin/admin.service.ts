import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [totalOrders, revenueAgg, activeProducts] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    return {
      totalOrders,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      activeProducts,
    };
  }
}
