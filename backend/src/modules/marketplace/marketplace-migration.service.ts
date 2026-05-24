import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Product, ProductVariant } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { slugifyName, withUniqueSlugSuffix } from '../../common/utils/slug.util';

export type MarketplaceMigrationStats = {
  dryRun: boolean;
  storesCreated: number;
  storesLinked: number;
  globalProductsCreated: number;
  globalProductsReused: number;
  globalVariantsCreated: number;
  globalVariantsReused: number;
  storeListingsCreated: number;
  storeListingsUpdated: number;
  storeListingsSkipped: number;
  productsProcessed: number;
  errors: string[];
};

type DedupeMaps = {
  catalogKeyToGlobalId: Map<string, string>;
  productIdToGlobalId: Map<string, string>;
};

@Injectable()
export class MarketplaceMigrationService {
  private readonly logger = new Logger(MarketplaceMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  run(dryRun = false): Promise<MarketplaceMigrationStats> {
    return this.execute(dryRun);
  }

  private catalogDedupeKey(name: string, categoryId: string | null): string {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${normalized}|${categoryId ?? ''}`;
  }

  private variantTypeValue(variant: ProductVariant): { type: string; value: string } {
    if (variant.size?.trim()) {
      return { type: 'size', value: variant.size.trim() };
    }
    if (variant.flavor?.trim()) {
      return { type: 'flavor', value: variant.flavor.trim() };
    }
    return { type: 'option', value: variant.title.trim() };
  }

  private async uniqueStoreSlug(base: string, tx: Prisma.TransactionClient): Promise<string> {
    let slug = slugifyName(base) || 'store';
    for (let i = 0; i < 30; i += 1) {
      const candidate = i === 0 ? slug : withUniqueSlugSuffix(slug, String(i));
      const exists = await tx.store.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!exists) return candidate;
    }
    return withUniqueSlugSuffix(slug, Date.now().toString(36));
  }

  private async uniqueGlobalSlug(
    base: string,
    tx: Prisma.TransactionClient,
    excludeId?: string,
  ): Promise<string> {
    let slug = slugifyName(base) || 'product';
    for (let i = 0; i < 30; i += 1) {
      const candidate = i === 0 ? slug : withUniqueSlugSuffix(slug, String(i));
      const exists = await tx.globalProduct.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return withUniqueSlugSuffix(slug, Date.now().toString(36));
  }

  private productImagesJson(product: Product): Prisma.InputJsonValue {
    const entries: Array<Record<string, string | number>> = [];
    if (product.imageUrl) {
      entries.push({
        url: product.imageUrl,
        cardUrl: product.imageCardUrl ?? product.imageUrl,
        thumbUrl: product.imageThumbUrl ?? product.imageUrl,
        sortOrder: 0,
      });
    }
    return entries as Prisma.InputJsonValue;
  }

  private listingPrice(product: Product): { price: number; oldPrice: number | null } {
    if (product.discountEnabled && product.discountedPrice && product.discountedPrice > 0) {
      return { price: product.discountedPrice, oldPrice: product.price };
    }
    return { price: product.price, oldPrice: null };
  }

  private async migrateStores(stats: MarketplaceMigrationStats, dryRun: boolean) {
    const businesses = await this.prisma.businessProfile.findMany({
      include: { store: true, user: { select: { id: true, role: true } } },
    });

    for (const bp of businesses) {
      if (bp.store) {
        stats.storesLinked += 1;
        continue;
      }

      if (dryRun) {
        stats.storesCreated += 1;
        continue;
      }

      const slug = await this.uniqueStoreSlug(bp.displayName, this.prisma);
      await this.prisma.store.create({
        data: {
          name: bp.displayName,
          slug,
          phone: bp.phone,
          address: bp.address,
          logoUrl: bp.logoUrl,
          isActive: bp.isActive && bp.status === 'APPROVED',
          businessProfileId: bp.id,
          ownerUserId: bp.user.role === 'BUSINESS' || bp.user.role === 'STORE_OWNER' ? bp.userId : null,
        },
      });
      stats.storesCreated += 1;
    }
  }

  private async loadExistingCatalogMaps(): Promise<DedupeMaps> {
    const catalogKeyToGlobalId = new Map<string, string>();
    const productIdToGlobalId = new Map<string, string>();

    const globals = await this.prisma.globalProduct.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
        legacyProductId: true,
      },
    });

    for (const g of globals) {
      catalogKeyToGlobalId.set(this.catalogDedupeKey(g.name, g.categoryId), g.id);
      if (g.legacyProductId) {
        productIdToGlobalId.set(g.legacyProductId, g.id);
      }
    }

    return { catalogKeyToGlobalId, productIdToGlobalId };
  }

  private async resolveGlobalProductId(
    product: Product,
    maps: DedupeMaps,
    stats: MarketplaceMigrationStats,
    dryRun: boolean,
  ): Promise<string | null> {
    const existingByLegacy = maps.productIdToGlobalId.get(product.id);
    if (existingByLegacy) return existingByLegacy;

    const dedupeKey = this.catalogDedupeKey(product.name, product.categoryId);
    const existingByKey = maps.catalogKeyToGlobalId.get(dedupeKey);
    if (existingByKey) {
      maps.productIdToGlobalId.set(product.id, existingByKey);
      stats.globalProductsReused += 1;
      return existingByKey;
    }

    if (dryRun) {
      const fakeId = `dry-global-${product.id}`;
      maps.catalogKeyToGlobalId.set(dedupeKey, fakeId);
      maps.productIdToGlobalId.set(product.id, fakeId);
      stats.globalProductsCreated += 1;
      return fakeId;
    }

    const slug = await this.uniqueGlobalSlug(product.name, this.prisma);
    const created = await this.prisma.globalProduct.create({
      data: {
        name: product.name,
        slug,
        description: product.description,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl,
        imageKey: product.imageKey,
        imageCardUrl: product.imageCardUrl,
        imageCardKey: product.imageCardKey,
        imageThumbUrl: product.imageThumbUrl,
        imageThumbKey: product.imageThumbKey,
        imagesJson: this.productImagesJson(product),
        unit: product.unit,
        isActive: product.isActive,
        legacyProductId: product.id,
      },
      select: { id: true },
    });

    maps.catalogKeyToGlobalId.set(dedupeKey, created.id);
    maps.productIdToGlobalId.set(product.id, created.id);
    stats.globalProductsCreated += 1;
    return created.id;
  }

  private async ensureGlobalVariant(
    globalProductId: string,
    variant: ProductVariant,
    stats: MarketplaceMigrationStats,
    dryRun: boolean,
  ): Promise<string | null> {
    if (dryRun && globalProductId.startsWith('dry-global-')) {
      stats.globalVariantsCreated += 1;
      return `dry-variant-${variant.id}`;
    }

    const byLegacy = await this.prisma.globalVariant.findUnique({
      where: { legacyVariantId: variant.id },
      select: { id: true },
    });
    if (byLegacy) {
      stats.globalVariantsReused += 1;
      return byLegacy.id;
    }

    const { type, value } = this.variantTypeValue(variant);
    const byKey = await this.prisma.globalVariant.findUnique({
      where: {
        globalProductId_type_value: { globalProductId, type, value },
      },
      select: { id: true },
    });
    if (byKey) {
      stats.globalVariantsReused += 1;
      if (!dryRun && !byLegacy) {
        await this.prisma.globalVariant.update({
          where: { id: byKey.id },
          data: { legacyVariantId: variant.id },
        });
      }
      return byKey.id;
    }

    if (dryRun) {
      stats.globalVariantsCreated += 1;
      return `dry-variant-${variant.id}`;
    }

    const created = await this.prisma.globalVariant.create({
      data: {
        globalProductId,
        type,
        value,
        imageUrl: variant.imageUrl,
        sku: variant.sku,
        sortOrder: variant.sortOrder,
        isActive: variant.isActive,
        legacyVariantId: variant.id,
      },
      select: { id: true },
    });
    stats.globalVariantsCreated += 1;
    return created.id;
  }

  private async upsertStoreListing(
    data: {
      storeId: string;
      globalProductId: string;
      globalVariantId: string | null;
      legacyProductId: string | null;
      price: number;
      oldPrice: number | null;
      stock: number;
      cashbackType: Product['cashbackType'];
      cashbackValue: number;
      isVisible: boolean;
      isTop: boolean;
      topOrder: number;
    },
    stats: MarketplaceMigrationStats,
    dryRun: boolean,
  ) {
    if (dryRun) {
      stats.storeListingsCreated += 1;
      return;
    }

    const existingByLegacy = data.legacyProductId
      ? await this.prisma.storeProduct.findUnique({
          where: { legacyProductId: data.legacyProductId },
        })
      : null;

    if (existingByLegacy) {
      await this.prisma.storeProduct.update({
        where: { id: existingByLegacy.id },
        data: {
          price: data.price,
          oldPrice: data.oldPrice,
          stock: data.stock,
          cashbackType: data.cashbackType,
          cashbackValue: data.cashbackValue,
          isVisible: data.isVisible,
          isTop: data.isTop,
          topOrder: data.topOrder,
          globalVariantId: data.globalVariantId,
        },
      });
      stats.storeListingsUpdated += 1;
      return;
    }

    const existingRow = await this.prisma.storeProduct.findFirst({
      where: {
        storeId: data.storeId,
        globalProductId: data.globalProductId,
        globalVariantId: data.globalVariantId,
      },
    });

    if (existingRow) {
      await this.prisma.storeProduct.update({
        where: { id: existingRow.id },
        data: {
          price: data.price,
          oldPrice: data.oldPrice,
          stock: data.stock,
          cashbackType: data.cashbackType,
          cashbackValue: data.cashbackValue,
          isVisible: data.isVisible,
          isTop: data.isTop,
          topOrder: data.topOrder,
          ...(data.legacyProductId ? { legacyProductId: data.legacyProductId } : {}),
        },
      });
      stats.storeListingsUpdated += 1;
      return;
    }

    try {
      await this.prisma.storeProduct.create({ data });
      stats.storeListingsCreated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push(message);
      stats.storeListingsSkipped += 1;
    }
  }

  private async buildStoreByBusinessId(dryRun: boolean): Promise<Map<string, string>> {
    const storeByBusinessId = new Map<string, string>();
    const stores = await this.prisma.store.findMany({
      where: { businessProfileId: { not: null } },
      select: { id: true, businessProfileId: true },
    });
    for (const s of stores) {
      if (s.businessProfileId) storeByBusinessId.set(s.businessProfileId, s.id);
    }

    if (dryRun) {
      const unlinked = await this.prisma.businessProfile.findMany({
        where: { store: null },
        select: { id: true },
      });
      for (const bp of unlinked) {
        storeByBusinessId.set(bp.id, `dry-store-${bp.id}`);
      }
    }

    return storeByBusinessId;
  }

  private async migrateProducts(stats: MarketplaceMigrationStats, dryRun: boolean) {
    const maps = await this.loadExistingCatalogMaps();
    const storeByBusinessId = await this.buildStoreByBusinessId(dryRun);

    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        variants: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    for (const product of products) {
      stats.productsProcessed += 1;
      const storeId = storeByBusinessId.get(product.businessId);
      if (!storeId) {
        stats.errors.push(`Product ${product.id}: store missing for business ${product.businessId}`);
        continue;
      }

      try {
        const globalProductId = await this.resolveGlobalProductId(product, maps, stats, dryRun);
        if (!globalProductId) continue;

        const baseListing = this.listingPrice(product);
        const activeVariants = product.variants;

        if (activeVariants.length === 0) {
          await this.upsertStoreListing(
            {
              storeId,
              globalProductId,
              globalVariantId: null,
              legacyProductId: product.id,
              price: baseListing.price,
              oldPrice: baseListing.oldPrice,
              stock: product.stockQuantity,
              cashbackType: product.cashbackType,
              cashbackValue: product.cashbackValue,
              isVisible: product.isActive,
              isTop: product.isTopProduct,
              topOrder: product.topOrder,
            },
            stats,
            dryRun,
          );
          continue;
        }

        let first = true;
        for (const variant of activeVariants) {
          const globalVariantId = await this.ensureGlobalVariant(
            globalProductId,
            variant,
            stats,
            dryRun,
          );
          const variantPrice =
            variant.discountPrice && variant.discountPrice > 0
              ? variant.discountPrice
              : variant.price;
          const variantOldPrice =
            variant.discountPrice && variant.discountPrice > 0 ? variant.price : null;

          await this.upsertStoreListing(
            {
              storeId,
              globalProductId,
              globalVariantId,
              legacyProductId: first ? product.id : null,
              price: variantPrice,
              oldPrice: variantOldPrice,
              stock: variant.stock,
              cashbackType: product.cashbackType,
              cashbackValue: product.cashbackValue,
              isVisible: product.isActive && variant.isActive,
              isTop: product.isTopProduct,
              topOrder: product.topOrder,
            },
            stats,
            dryRun,
          );
          first = false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Product ${product.id}: ${message}`);
        this.logger.warn(message);
      }
    }
  }

  async execute(dryRun: boolean): Promise<MarketplaceMigrationStats> {
    const stats: MarketplaceMigrationStats = {
      dryRun,
      storesCreated: 0,
      storesLinked: 0,
      globalProductsCreated: 0,
      globalProductsReused: 0,
      globalVariantsCreated: 0,
      globalVariantsReused: 0,
      storeListingsCreated: 0,
      storeListingsUpdated: 0,
      storeListingsSkipped: 0,
      productsProcessed: 0,
      errors: [],
    };

    this.logger.log(dryRun ? 'Marketplace migration (dry run)' : 'Marketplace migration started');
    await this.migrateStores(stats, dryRun);
    await this.migrateProducts(stats, dryRun);
    this.logger.log(JSON.stringify(stats));
    return stats;
  }
}
