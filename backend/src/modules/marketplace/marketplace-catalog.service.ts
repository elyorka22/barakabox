import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Read-only helpers for the additive global catalog (Stage 1). */
@Injectable()
export class MarketplaceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogCounts() {
    const [globalProducts, globalVariants, stores, storeProducts] =
      await Promise.all([
        this.prisma.globalProduct.count(),
        this.prisma.globalVariant.count(),
        this.prisma.store.count(),
        this.prisma.storeProduct.count(),
      ]);

    return { globalProducts, globalVariants, stores, storeProducts };
  }
}
