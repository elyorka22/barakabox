import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import {
  AdminBannerQueryDto,
  BannerResponse,
  CreateBannerDto,
  PublicBannerQueryDto,
  ReorderBannerEntryDto,
  UpdateBannerDto,
} from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listPublic(query: PublicBannerQueryDto): Promise<BannerResponse[]> {
    if (query.active === false) {
      const banners = await this.prisma.banner.findMany({
        where: { isActive: false },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      return banners;
    }
    return this.cache.getOrSet(cacheKeys.bannersActive(), CACHE_TTL.banners, async () => {
      return this.prisma.banner.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
    });
  }

  async listAdmin(query: AdminBannerQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { subtitle: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(dto: CreateBannerDto) {
    const nextSort = dto.sortOrder ?? (await this.computeNextSortOrder());
    return this.prisma.banner.create({
      data: {
        title: dto.title?.trim() || null,
        subtitle: dto.subtitle?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        buttonText: dto.buttonText?.trim() || null,
        buttonLink: dto.buttonLink?.trim() || null,
        backgroundColor: dto.backgroundColor ?? null,
        textColor: dto.textColor ?? null,
        overlayOpacity: dto.overlayOpacity ?? 0,
        sortOrder: nextSort,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Banner topilmadi');
    }
    return this.prisma.banner.update({
      where: { id },
      data: {
        title: typeof dto.title === 'string' ? dto.title.trim() || null : undefined,
        subtitle: typeof dto.subtitle === 'string' ? dto.subtitle.trim() || null : undefined,
        imageUrl: typeof dto.imageUrl === 'string' ? dto.imageUrl.trim() || null : undefined,
        buttonText: typeof dto.buttonText === 'string' ? dto.buttonText.trim() || null : undefined,
        buttonLink: typeof dto.buttonLink === 'string' ? dto.buttonLink.trim() || null : undefined,
        backgroundColor: typeof dto.backgroundColor === 'string' ? dto.backgroundColor : undefined,
        textColor: typeof dto.textColor === 'string' ? dto.textColor : undefined,
        overlayOpacity: typeof dto.overlayOpacity === 'number' ? dto.overlayOpacity : undefined,
        sortOrder: typeof dto.sortOrder === 'number' ? dto.sortOrder : undefined,
        isActive: typeof dto.isActive === 'boolean' ? dto.isActive : undefined,
      },
    });
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Banner topilmadi');
    }
    return this.prisma.banner.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Banner topilmadi');
    }
    return this.prisma.banner.delete({ where: { id } });
  }

  async reorder(items: ReorderBannerEntryDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      return { updated: 0 };
    }
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.banner.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { updated: items.length };
  }

  private async computeNextSortOrder() {
    const last = await this.prisma.banner.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  }
}
