import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, Store } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isStoreOperatorRole, normalizeRole } from '../../common/roles';

@Injectable()
export class StoreContextService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, businessProfileId: true },
    });
  }
}
