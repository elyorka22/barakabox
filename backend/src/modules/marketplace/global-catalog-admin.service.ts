import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { slugifyName, withUniqueSlugSuffix } from '../../common/utils/slug.util';
import { throwMappedPrismaError } from '../../common/utils/prisma-errors';
import {
  CreateGlobalProductDto,
  CreateGlobalVariantDto,
  UpdateGlobalProductDto,
  normalizeAttributes,
  resolveGlobalImageUrl,
} from './dto/global-catalog.dto';

const globalProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  brand: true,
  unit: true,
  imageUrl: true,
  imageCardUrl: true,
  imageThumbUrl: true,
  imagesJson: true,
  attributes: true,
  isActive: true,
  categoryId: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      type: true,
      value: true,
      imageUrl: true,
      sku: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.GlobalProductSelect;

@Injectable()
export class GlobalCatalogAdminService {
  private readonly logger = new Logger(GlobalCatalogAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private touchStorefrontCache() {
    void this.cache.invalidateStorefrontCatalog();
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const slug = slugifyName(base) || 'product';
    for (let i = 0; i < 20; i += 1) {
      const candidate = i === 0 ? slug : withUniqueSlugSuffix(slug, String(i));
      const existing = await this.prisma.globalProduct.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    return withUniqueSlugSuffix(slug, Date.now().toString(36));
  }

  private async assertCategoryId(categoryId: string | null | undefined) {
    const id = categoryId?.trim();
    if (!id) return null;
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('Kategoriya topilmadi');
    }
    return id;
  }

  async listGlobalProducts(opts?: {
    q?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 24));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();
    const categoryId = opts?.categoryId?.trim() || undefined;

    const where: Prisma.GlobalProductWhereInput = {};
    if (!opts?.includeInactive) {
      where.isActive = true;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.globalProduct.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: globalProductSelect,
        }),
        this.prisma.globalProduct.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (error) {
      this.logger.error(
        `listGlobalProducts failed (page=${page}, q=${q ?? ''}, categoryId=${categoryId ?? ''})`,
        error instanceof Error ? error.stack : String(error),
      );
      throwMappedPrismaError(error, 'listGlobalProducts');
      throw error;
    }
  }

  async createGlobalProduct(dto: CreateGlobalProductDto) {
    const slug = await this.uniqueSlug(dto.slug?.trim() || dto.name);
    const imageUrl = resolveGlobalImageUrl(dto);
    const categoryId = await this.assertCategoryId(dto.categoryId);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.globalProduct.create({
          data: {
            name: dto.name.trim(),
            slug,
            description: dto.description?.trim() || null,
            categoryId,
            brand: dto.brand?.trim() || null,
            imageUrl,
            unit: dto.unit ?? 'dona',
            attributes: normalizeAttributes(dto.attributes),
            isActive: dto.isActive ?? true,
          },
        });

        const nested = dto.variants ?? [];
        for (let i = 0; i < nested.length; i += 1) {
          const v = nested[i];
          await tx.globalVariant.create({
            data: {
              globalProductId: created.id,
              type: v.type.trim(),
              value: v.value.trim(),
              imageUrl: resolveGlobalImageUrl(v),
              sku: v.sku?.trim() || null,
              sortOrder: v.sortOrder ?? i,
            },
          });
        }

        return tx.globalProduct.findUniqueOrThrow({
          where: { id: created.id },
          select: globalProductSelect,
        });
      });

      this.touchStorefrontCache();
      this.logger.log(`Created global product ${product.id} (${product.slug})`);
      return product;
    } catch (error) {
      this.logger.error(
        `createGlobalProduct failed name=${dto.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      throwMappedPrismaError(error, 'createGlobalProduct');
      throw error;
    }
  }

  async updateGlobalProduct(id: string, dto: UpdateGlobalProductDto) {
    const existing = await this.prisma.globalProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Global mahsulot topilmadi');

    const slug =
      dto.slug !== undefined
        ? await this.uniqueSlug(dto.slug?.trim() || dto.name?.trim() || existing.name, id)
        : undefined;

    const imageProvided = dto.imageUrl !== undefined || dto.image !== undefined;
    const imageUrl = imageProvided
      ? resolveGlobalImageUrl({ imageUrl: dto.imageUrl, image: dto.image })
      : undefined;

    const categoryId =
      dto.categoryId !== undefined ? await this.assertCategoryId(dto.categoryId) : undefined;

    try {
      const updated = await this.prisma.globalProduct.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
          ...(dto.attributes !== undefined
            ? { attributes: normalizeAttributes(dto.attributes ?? undefined) }
            : {}),
          ...(imageProvided ? { imageUrl } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: globalProductSelect,
      });
      this.touchStorefrontCache();
      return updated;
    } catch (error) {
      this.logger.error(
        `updateGlobalProduct failed id=${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throwMappedPrismaError(error, 'updateGlobalProduct');
      throw error;
    }
  }

  async addVariant(globalProductId: string, dto: CreateGlobalVariantDto) {
    const product = await this.prisma.globalProduct.findUnique({
      where: { id: globalProductId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Global mahsulot topilmadi');

    try {
      const variant = await this.prisma.globalVariant.create({
        data: {
          globalProductId,
          type: dto.type.trim(),
          value: dto.value.trim(),
          imageUrl: resolveGlobalImageUrl(dto),
          sku: dto.sku?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      this.touchStorefrontCache();
      return variant;
    } catch (error) {
      this.logger.error(
        `addVariant failed productId=${globalProductId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throwMappedPrismaError(error, 'addGlobalVariant');
      throw error;
    }
  }
}
