import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  mapStorefrontProduct,
  storefrontProductSelect,
} from '../products/storefront-product.mapper';
import { mapListingToStorefront, storefrontListingSelect } from './storefront-listing.mapper';

const VISIBLE_LISTING_WHERE: Prisma.StoreProductWhereInput = {
  isVisible: true,
  stock: { gt: 0 },
  store: { isActive: true },
  globalProduct: { isActive: true },
};

@Injectable()
export class StorefrontListingProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getStorefrontProductByListingId(listingId: string) {
    const listing = await this.prisma.storeProduct.findFirst({
      where: { id: listingId, ...VISIBLE_LISTING_WHERE },
      select: storefrontListingSelect,
    });
    if (!listing) {
      throw new NotFoundException('Listing topilmadi');
    }

    if (!listing.legacyProductId) {
      return mapListingToStorefront(listing);
    }

    const legacy = await this.prisma.product.findFirst({
      where: {
        id: listing.legacyProductId,
        isActive: true,
        business: { isActive: true, status: 'APPROVED' },
      },
      select: storefrontProductSelect,
    });

    if (!legacy) {
      return { ...mapListingToStorefront(listing), purchasable: false };
    }

    const mapped = mapStorefrontProduct(legacy);
    const listingCard = mapListingToStorefront(listing);
    const hasDiscount =
      listing.oldPrice !== null && listing.oldPrice > listing.price;

    return {
      ...mapped,
      listingId: listing.id,
      storeId: listing.store.id,
      storeName: listing.store.name,
      storeSlug: listing.store.slug,
      purchasable: true,
      price: String(listing.price),
      effectivePrice: listing.price,
      discountEnabled: hasDiscount,
      discountedPrice: hasDiscount ? listing.price : mapped.discountedPrice,
      oldPrice: hasDiscount ? listing.oldPrice : mapped.oldPrice,
      discountPercent: listingCard.discountPercent,
      stock: listing.stock,
      imageUrl: listingCard.imageUrl ?? mapped.imageUrl,
      imageCardUrl: listingCard.imageCardUrl ?? mapped.imageCardUrl,
      imageThumbUrl: listingCard.imageThumbUrl ?? mapped.imageThumbUrl,
    };
  }
}
