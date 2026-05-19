import { ProductUnit, CashbackType, Prisma, SellingMode } from '@prisma/client';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UploadService } from '../upload/upload.service';
import type { UpdateProductDto } from './dto/update-product.dto';

function defaultSellingModeForUnit(unit: ProductUnit): SellingMode {
  if (unit === 'kg') return 'KILOGRAM_STEP';
  if (unit === 'gramm') return 'GRAM_STEP';
  return 'PIECE';
}

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

  listForAdmin(opts?: {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    businessId?: string;
    includeInactive?: boolean;
    stockFilter?: 'all' | 'in_stock' | 'low' | 'out';
    sortBy?: 'newest' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();

    const where: Prisma.ProductWhereInput = {};
    if (!opts?.includeInactive) {
      where.isActive = true;
    }
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (opts?.categoryId) {
      where.categoryId = opts.categoryId;
    }
    if (opts?.businessId) {
      where.businessId = opts.businessId;
    }
    const stockFilter = opts?.stockFilter ?? 'all';
    if (stockFilter === 'out') {
      where.stockQuantity = { lte: 0 };
    } else if (stockFilter === 'low') {
      where.stockQuantity = { gt: 0, lte: 5 };
    } else if (stockFilter === 'in_stock') {
      where.stockQuantity = { gt: 5 };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      opts?.sortBy === 'stock_asc'
        ? { stockQuantity: 'asc' }
        : opts?.sortBy === 'stock_desc'
          ? { stockQuantity: 'desc' }
          : opts?.sortBy === 'price_asc'
            ? { price: 'asc' }
            : opts?.sortBy === 'price_desc'
              ? { price: 'desc' }
              : { updatedAt: 'desc' };

    const select = {
      id: true,
      name: true,
      price: true,
      stockQuantity: true,
      unit: true,
      sellingMode: true,
      stepAmount: true,
      minimumAmount: true,
      businessId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      cashbackType: true,
      cashbackValue: true,
      imageThumbUrl: true,
      imageCardUrl: true,
      imageUrl: true,
      imageKey: true,
      category: { select: { id: true, name: true } },
      business: { select: { id: true, displayName: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          title: true,
          flavor: true,
          description: true,
          price: true,
          discountPrice: true,
          stock: true,
          sku: true,
          imageUrl: true,
        },
      },
    };

    return Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        select,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, limit }));
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
      sellingMode?: SellingMode;
      stepAmount?: number;
      minimumAmount?: number;
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

    const sellingMode = data.sellingMode ?? defaultSellingModeForUnit(data.unit);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          businessId: business.id,
          name: data.name,
          description: data.description,
          unit: data.unit,
          sellingMode,
          stepAmount: data.stepAmount ?? null,
          minimumAmount: data.minimumAmount ?? null,
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

  async createByBusinessOwner(userId: string, data: Parameters<ProductsService['createByAdmin']>[1]) {
    const business = await this.requireApprovedBusiness(userId);
    return this.createByAdmin(business.id, data);
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
      sellingMode?: SellingMode;
      stepAmount?: number;
      minimumAmount?: number;
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
          ...(data.sellingMode !== undefined ? { sellingMode: data.sellingMode } : {}),
          ...(data.stepAmount !== undefined ? { stepAmount: data.stepAmount } : {}),
          ...(data.minimumAmount !== undefined ? { minimumAmount: data.minimumAmount } : {}),
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

  async updateByBusinessOwner(productId: string, userId: string, data: UpdateProductDto) {
    const business = await this.requireApprovedBusiness(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== business.id) {
      throw new ForbiddenException('Bu mahsulot sizning do‘koningizga tegishli emas');
    }
    return this.updateByAdmin(productId, data);
  }

  async removeByBusinessOwner(productId: string, userId: string) {
    const business = await this.requireApprovedBusiness(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== business.id) {
      throw new ForbiddenException('Bu mahsulot sizning do‘koningizga tegishli emas');
    }
    return this.removeByAdmin(productId);
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
