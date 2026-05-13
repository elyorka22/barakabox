import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  AdminCategoryQueryDto,
  CreateCategoryDto,
  PublicCategoriesQueryDto,
  PublicCategoryProductsQueryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(name: string) {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || `category-${Date.now()}`;
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    const base = this.slugify(name);
    for (let i = 0; i < 100; i += 1) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const exists = await this.prisma.category.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException('Slug yaratib bo‘lmadi');
  }

  async listPublicCategories(query: PublicCategoriesQueryDto) {
    const where = {
      isActive: query.active ?? true,
      ...(query.featured ? { isFeatured: true } : {}),
    };
    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        isFeatured: true,
        isActive: true,
        sortOrder: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                business: { status: 'APPROVED' },
              },
            },
          },
        },
      },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      isFeatured: category.isFeatured,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    }));
  }

  async listAdmin(query: AdminCategoryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          sortOrder: true,
          isFeatured: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const { _count, ...rest } = item;
        return {
          ...rest,
          productCount: _count.products,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createAdminCategory(dto: CreateCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        imageUrl: dto.imageUrl || null,
        sortOrder: dto.sortOrder ?? 0,
        isFeatured: dto.isFeatured ?? true,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAdminCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Kategoriya topilmadi');
    }
    const slug = dto.name ? await this.generateUniqueSlug(dto.name, id) : undefined;
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug,
        imageUrl: typeof dto.imageUrl === 'string' ? dto.imageUrl : undefined,
        sortOrder: dto.sortOrder,
        isFeatured: dto.isFeatured,
        isActive: dto.isActive,
      },
    });
  }

  async updateAdminCategoryStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Kategoriya topilmadi');
    }
    return this.prisma.category.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteAdminCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Kategoriya topilmadi');
    }
    return this.prisma.category.delete({ where: { id } });
  }

  async listCategoryProducts(slug: string, query: PublicCategoryProductsQueryDto) {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!category) {
      throw new NotFoundException('Kategoriya topilmadi');
    }
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const skip = (page - 1) * limit;
    const where = {
      categoryId: category.id,
      isActive: true,
      business: { status: 'APPROVED' as const },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          imageUrl: true,
          imageCardUrl: true,
          imageThumbUrl: true,
          stockQuantity: true,
          business: {
            select: {
              id: true,
              displayName: true,
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              title: true,
              flavor: true,
              size: true,
              price: true,
              stock: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      category,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
