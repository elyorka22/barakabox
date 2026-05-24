import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { StoreType } from '@prisma/client';
import { StorefrontStoresService, StoreListSection } from './storefront-stores.service';

function parseSection(raw?: string): StoreListSection | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === 'featured' || v === 'new' || v === 'top' || v === 'nearby') return v;
  return undefined;
}

function parseStoreType(raw?: string): StoreType | undefined {
  const v = raw?.trim().toUpperCase();
  const allowed: StoreType[] = [
    'GROCERY',
    'PHARMACY',
    'PET',
    'BABY',
    'ELECTRONICS',
    'COSMETICS',
  ];
  if (v && allowed.includes(v as StoreType)) return v as StoreType;
  return undefined;
}

function parseBool(raw?: string): boolean {
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Public store showcase APIs (stores-first marketplace). */
@Controller('stores')
export class StorefrontStoresController {
  constructor(private readonly stores: StorefrontStoresService) {}

  @Get('featured')
  listFeatured() {
    return this.stores.listFeatured();
  }

  @Get()
  listStores(
    @Query('section') section?: string,
    @Query('type') type?: string,
    @Query('storeType') storeType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.stores.listStores({
      section: parseSection(section),
      storeType: parseStoreType(storeType ?? type),
      page: Number(page || 1),
      limit: Number(limit || 24),
      lat: lat != null && lat !== '' ? Number(lat) : undefined,
      lng: lng != null && lng !== '' ? Number(lng) : undefined,
    });
  }

  @Get(':slug/products')
  async listProducts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('promo') promo?: string,
  ) {
    return this.stores.listStoreProducts(slug, {
      page: Number(page || 1),
      limit: Number(limit || 24),
      q,
      categoryId,
      promo: parseBool(promo),
    });
  }

  @Get(':slug')
  async getStore(@Param('slug') slug: string) {
    const data = await this.stores.getStoreBySlug(slug);
    if (!data) throw new NotFoundException('Do‘kon topilmadi');
    return data;
  }
}
