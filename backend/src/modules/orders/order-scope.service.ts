import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class OrderScopeService {
  constructor(private readonly prisma: PrismaService) {}

  businessOrderWhere(businessProfileId: string): Prisma.OrderWhereInput {
    return {
      items: {
        some: {
          OR: [
            { product: { businessId: businessProfileId } },
            { variant: { product: { businessId: businessProfileId } } },
          ],
        },
      },
    };
  }

  async orderWhereForStore(storeId: string): Promise<Prisma.OrderWhereInput> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        businessProfileId: true,
        storeProducts: {
          where: { legacyProductId: { not: null } },
          select: { legacyProductId: true },
        },
      },
    });

    if (!store) {
      return { id: '__none__' };
    }

    const parts: Prisma.OrderWhereInput[] = [{ storeId }];
    if (store.businessProfileId) {
      parts.push(this.businessOrderWhere(store.businessProfileId));
    }

    const legacyProductIds = store.storeProducts
      .map((row) => row.legacyProductId)
      .filter((id): id is string => Boolean(id));

    if (legacyProductIds.length > 0) {
      parts.push({
        items: { some: { productId: { in: legacyProductIds } } },
      });
    }

    if (parts.length === 0) {
      return { id: '__none__' };
    }
    if (parts.length === 1) return parts[0];
    return { OR: parts };
  }

  /**
   * Staff scope: store pickers/couriers see only their store; legacy businessScopeId fallback.
   * Returns null = platform-wide queue (unscoped pickers).
   */
  async resolveStaffOrderScope(userId: string): Promise<Prisma.OrderWhereInput | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storeScopeId: true, businessScopeId: true },
    });
    if (!user) return null;

    if (user.storeScopeId) {
      return this.orderWhereForStore(user.storeScopeId);
    }
    if (user.businessScopeId) {
      return this.businessOrderWhere(user.businessScopeId);
    }
    return null;
  }

  async assertOrderMatchesScope(orderId: string, scope: Prisma.OrderWhereInput | null): Promise<void> {
    if (!scope) return;
    const count = await this.prisma.order.count({
      where: { id: orderId, AND: [scope] },
    });
    if (count === 0) {
      throw new ForbiddenException('Bu buyurtma sizning do‘koningizga tegishli emas');
    }
  }
}
