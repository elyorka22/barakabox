import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role, Store } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { slugifyName, withUniqueSlugSuffix } from '../../common/utils/slug.util';
import { isStoreOperatorRole, normalizeRole } from '../../common/roles';

@Injectable()
export class StoreContextService {
  private readonly logger = new Logger(StoreContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async uniqueStoreSlug(base: string): Promise<string> {
    const slug = slugifyName(base) || 'store';
    for (let i = 0; i < 30; i += 1) {
      const candidate = i === 0 ? slug : withUniqueSlugSuffix(slug, String(i));
      const exists = await this.prisma.store.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return withUniqueSlugSuffix(slug, Date.now().toString(36));
  }

  /**
   * Ensures a marketplace Store exists for this business user (idempotent).
   * Admin global catalog is platform-wide; each business needs its own Store to add listings.
   */
  async ensureStoreLinkedToBusinessProfile(userId: string): Promise<Store> {
    const bp = await this.prisma.businessProfile.findUnique({
      where: { userId },
      include: { store: true },
    });
    if (!bp) {
      throw new ForbiddenException('Biznes profili topilmadi');
    }

    if (bp.store) {
      if (!bp.store.isActive && bp.isActive && bp.status === 'APPROVED') {
        return this.prisma.store.update({
          where: { id: bp.store.id },
          data: { isActive: true },
        });
      }
      return bp.store;
    }

    const slug = await this.uniqueStoreSlug(bp.displayName);
    try {
      const store = await this.prisma.store.create({
        data: {
          name: bp.displayName,
          slug,
          phone: bp.phone,
          address: bp.address,
          logoUrl: bp.logoUrl,
          isActive: bp.isActive && bp.status === 'APPROVED',
          businessProfileId: bp.id,
          ownerUserId: userId,
        },
      });
      this.logger.log(
        `Auto-linked marketplace store ${store.id} (${store.slug}) to business ${bp.id}`,
      );
      return store;
    } catch {
      const existing = await this.prisma.store.findFirst({
        where: { businessProfileId: bp.id },
      });
      if (existing) return existing;
      throw new ForbiddenException('Marketplace do‘konini yaratib bo‘lmadi');
    }
  }

  /** Store owned by STORE_OWNER user. */
  async requireOwnedStore(userId: string): Promise<Store> {
    const store = await this.prisma.store.findFirst({
      where: { ownerUserId: userId, isActive: true },
    });
    if (!store) {
      throw new ForbiddenException('Do‘kon topilmadi yoki faol emas');
    }
    return store;
  }

  async findOwnedStore(userId: string): Promise<Store | null> {
    return this.prisma.store.findFirst({
      where: { ownerUserId: userId, isActive: true },
    });
  }

  /** Resolves legacy BusinessProfile id for store operators (BUSINESS or STORE_OWNER). */
  async resolveBusinessProfileId(userId: string, role: string | Role): Promise<string> {
    const r = normalizeRole(String(role));
    if (r === 'BUSINESS') {
      const bp = await this.prisma.businessProfile.findUnique({ where: { userId } });
      if (!bp) throw new ForbiddenException('Biznes profili topilmadi');
      return bp.id;
    }
    if (r === 'STORE_OWNER') {
      const store = await this.requireOwnedStore(userId);
      if (!store.businessProfileId) {
        throw new ForbiddenException(
          'Do‘kon hali biznes profiliga ulanmagan. Admin bilan bog‘laning.',
        );
      }
      return store.businessProfileId;
    }
    throw new ForbiddenException('Ruxsat yo‘q');
  }

  assertStoreOperator(role: string): void {
    if (!isStoreOperatorRole(role)) {
      throw new ForbiddenException('Faqat do‘kon egasi uchun');
    }
  }

  async requireStoreById(storeId: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Do‘kon topilmadi');
    return store;
  }

  listStoresForAdmin() {
    return this.prisma.store.findMany({
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      select: {
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
      },
    });
  }
}
