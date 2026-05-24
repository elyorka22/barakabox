import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { throwMappedPrismaError } from '../../common/utils/prisma-errors';
import { UpdateStoreDto } from './dto/store-admin.dto';
import { StoreContextService } from './store-context.service';

const storeSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bannerUrl: true,
  description: true,
  address: true,
  phone: true,
  deliveryTimeMinutes: true,
  rating: true,
  deliveryPrice: true,
  minOrderPrice: true,
  isActive: true,
  isFeatured: true,
  sortOrder: true,
  businessProfileId: true,
  createdAt: true,
} satisfies Prisma.StoreSelect;

export type StoreMediaKind = 'logo' | 'banner';

@Injectable()
export class StoreAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeContext: StoreContextService,
    private readonly uploadService: UploadService,
    private readonly cache: CacheService,
  ) {}

  async getStore(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: storeSelect,
    });
    if (!store) throw new NotFoundException('Do‘kon topilmadi');
    return store;
  }

  async updateStore(storeId: string, dto: UpdateStoreDto) {
    await this.storeContext.requireStoreById(storeId);
    try {
      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.deliveryTimeMinutes !== undefined
            ? { deliveryTimeMinutes: dto.deliveryTimeMinutes }
            : {}),
          ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
          ...(dto.deliveryPrice !== undefined ? { deliveryPrice: dto.deliveryPrice } : {}),
          ...(dto.minOrderPrice !== undefined ? { minOrderPrice: dto.minOrderPrice } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        select: storeSelect,
      });
      await this.cache.invalidateMarketplaceStorefront(updated.slug);
      return updated;
    } catch (error) {
      throwMappedPrismaError(error, 'updateStore');
      throw error;
    }
  }

  async uploadStoreImage(storeId: string, kind: StoreMediaKind, file: Express.Multer.File) {
    const store = await this.storeContext.requireStoreById(storeId);
    const uploaded = await this.uploadService.uploadStoreImage(storeId, kind, file);
    const field = kind === 'logo' ? 'logoUrl' : 'bannerUrl';
    const previousUrl = store[field];

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { [field]: uploaded.url },
      select: storeSelect,
    });

    if (previousUrl && previousUrl !== uploaded.url) {
      await this.uploadService.deleteImageByUrl(previousUrl).catch(() => undefined);
    }

    await this.cache.invalidateMarketplaceStorefront(store.slug);
    return { store: updated, upload: uploaded };
  }
}
