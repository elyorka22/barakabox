import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireApprovedBusiness(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { userId },
    });
    if (!business || business.status !== 'APPROVED') {
      throw new ForbiddenException('Business is not approved');
    }
    return business;
  }

  list() {
    return this.prisma.product.findMany({
      where: { isActive: true, business: { status: 'APPROVED' } },
      include: { business: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createByAdmin(
    businessId: string,
    data: { name: string; description?: string; price: number; stock: number; categoryId?: string },
  ) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: businessId },
    });
    if (!business || business.status !== 'APPROVED') {
      throw new NotFoundException('Approved business not found');
    }

    return this.prisma.product.create({
      data: {
        businessId: business.id,
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
      },
    });
  }

  async listMine(userId: string) {
    const business = await this.requireApprovedBusiness(userId);
    return this.prisma.product.findMany({
      where: { businessId: business.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateByAdmin(
    productId: string,
    data: { name?: string; description?: string; price?: number; stock?: number; categoryId?: string },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
      },
    });
  }

  async removeByAdmin(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  }
}
