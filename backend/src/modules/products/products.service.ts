import { ProductUnit, CashbackType } from '@prisma/client';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

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
      include: {
        business: true,
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(term: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      isActive: true,
      OR: [
        { name: { contains: term, mode: 'insensitive' as const } },
        {
          variants: {
            some: {
              OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { flavor: { contains: term, mode: 'insensitive' as const } },
                { sku: { contains: term, mode: 'insensitive' as const } },
                { barcode: { contains: term, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ],
    };
    return this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  async createByAdmin(
    businessId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      stockQuantity: number;
      unit: ProductUnit;
      cashbackType?: CashbackType;
      cashbackValue?: number;
      categoryId?: string;
      imageUrl?: string;
      imageKey?: string;
      imageCardUrl?: string;
      imageCardKey?: string;
      imageThumbUrl?: string;
      imageThumbKey?: string;
      variants?: Array<{
        title: string;
        flavor?: string;
        size?: string;
        sku?: string;
        barcode?: string;
        description?: string;
        price: number;
        discountPrice?: number;
        stock: number;
        imageUrl?: string;
        sortOrder?: number;
      }>;
    },
  ) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: businessId },
    });
    if (!business || business.status !== 'APPROVED') {
      throw new NotFoundException('Approved business not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          businessId: business.id,
          name: data.name,
          description: data.description,
          unit: data.unit,
          price: data.price,
          stockQuantity: data.stockQuantity,
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          imageCardUrl: data.imageCardUrl,
          imageCardKey: data.imageCardKey,
          imageThumbUrl: data.imageThumbUrl,
          imageThumbKey: data.imageThumbKey,
          cashbackType: data.cashbackType ?? 'NONE',
          cashbackValue: data.cashbackValue ?? 0,
          variants: {
            create: (data.variants?.length
              ? data.variants
              : [
                  {
                    title: data.name,
                    description: data.description,
                    price: data.price,
                    stock: data.stockQuantity,
                    imageUrl: data.imageUrl,
                    sortOrder: 0,
                  },
                ]
            ).map((variant, idx) => ({
              title: variant.title,
              flavor: variant.flavor,
              size: variant.size,
              sku: variant.sku,
              barcode: variant.barcode,
              description: variant.description,
              price: variant.price,
              discountPrice: variant.discountPrice,
              stock: variant.stock,
              imageUrl: variant.imageUrl,
              sortOrder: variant.sortOrder ?? idx,
            })),
          },
        },
      });
      if (data.stockQuantity > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            change: data.stockQuantity,
            reason: 'INCOME',
          },
        });
      }
      return product;
    });
  }

  async listMine(userId: string) {
    const business = await this.requireApprovedBusiness(userId);
    return this.prisma.product.findMany({
      where: { businessId: business.id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateByAdmin(
    productId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      stockQuantity?: number;
      unit?: ProductUnit;
      cashbackType?: CashbackType;
      cashbackValue?: number;
      categoryId?: string;
      imageUrl?: string;
      imageKey?: string;
      imageCardUrl?: string;
      imageCardKey?: string;
      imageThumbUrl?: string;
      imageThumbKey?: string;
      variants?: Array<{
        id?: string;
        title: string;
        flavor?: string;
        size?: string;
        sku?: string;
        barcode?: string;
        description?: string;
        price: number;
        discountPrice?: number;
        stock: number;
        imageUrl?: string;
        sortOrder?: number;
      }>;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const cleanupPairs: Array<{ old?: string | null; next?: string | null }> = [
      { old: product.imageKey, next: data.imageKey },
      { old: product.imageCardKey, next: data.imageCardKey },
      { old: product.imageThumbKey, next: data.imageThumbKey },
    ];
    for (const pair of cleanupPairs) {
      if (pair.old && (!pair.next || pair.old !== pair.next)) {
        await this.uploadService.deleteImage(pair.old);
      }
    }
    return this.prisma.$transaction(async (tx) => {
      if (data.variants) {
        const incomingIds = data.variants.map((variant) => variant.id).filter(Boolean) as string[];
        await tx.productVariant.updateMany({
          where: {
            productId,
            ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}),
          },
          data: { isActive: false },
        });
        for (let i = 0; i < data.variants.length; i += 1) {
          const variant = data.variants[i];
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                title: variant.title,
                flavor: variant.flavor,
                size: variant.size,
                sku: variant.sku,
                barcode: variant.barcode,
                description: variant.description,
                price: variant.price,
                discountPrice: variant.discountPrice,
                stock: variant.stock,
                imageUrl: variant.imageUrl,
                sortOrder: variant.sortOrder ?? i,
                isActive: true,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                title: variant.title,
                flavor: variant.flavor,
                size: variant.size,
                sku: variant.sku,
                barcode: variant.barcode,
                description: variant.description,
                price: variant.price,
                discountPrice: variant.discountPrice,
                stock: variant.stock,
                imageUrl: variant.imageUrl,
                sortOrder: variant.sortOrder ?? i,
                isActive: true,
              },
            });
          }
        }
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          stockQuantity: data.stockQuantity,
          ...(data.unit !== undefined ? { unit: data.unit } : {}),
          ...(data.cashbackType !== undefined ? { cashbackType: data.cashbackType } : {}),
          ...(data.cashbackValue !== undefined ? { cashbackValue: data.cashbackValue } : {}),
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          imageCardUrl: data.imageCardUrl,
          imageCardKey: data.imageCardKey,
          imageThumbUrl: data.imageThumbUrl,
          imageThumbKey: data.imageThumbKey,
        },
      });
      if (typeof data.stockQuantity === 'number' && data.stockQuantity !== product.stockQuantity) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            change: data.stockQuantity - product.stockQuantity,
            reason: 'ADJUSTMENT',
          },
        });
      }
      return updated;
    });
  }

  async removeByAdmin(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    for (const key of [product.imageKey, product.imageCardKey, product.imageThumbKey]) {
      if (key) {
        await this.uploadService.deleteImage(key);
      }
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  }
}
