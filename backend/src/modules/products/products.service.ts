import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({
      where: { isActive: true, business: { status: 'APPROVED' } },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: { name: string; description?: string; price: number; stock: number }) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business || business.status !== 'APPROVED') {
      throw new ForbiddenException('Business is not approved');
    }

    return this.prisma.product.create({
      data: {
        businessId: business.id,
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
      },
    });
  }
}
