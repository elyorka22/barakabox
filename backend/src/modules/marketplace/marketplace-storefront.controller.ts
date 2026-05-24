import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { StorefrontHomeService } from './storefront-home.service';
import { StorefrontListingProductService } from './storefront-listing-product.service';
import {
  MarketplaceCatalogSort,
  StorefrontMarketplaceCatalogService,
} from './storefront-marketplace-catalog.service';

/** Public marketplace storefront (additive homepage sections). */
@Controller('marketplace')
export class MarketplaceStorefrontController {
  constructor(
    private readonly storefrontHome: StorefrontHomeService,
    private readonly listingProduct: StorefrontListingProductService,
    private readonly marketplaceCatalog: StorefrontMarketplaceCatalogService,
  ) {}

  @Get('catalog/popular')
  listPopular(@Query('limit') limit?: string) {
    return this.marketplaceCatalog.listPopular(Number(limit || 12));
  }

  @Get('catalog/promotions')
  listPromotions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.marketplaceCatalog.listPromotions({
      page: Number(page || 1),
      limit: Number(limit || 12),
    });
  }

  @Get('catalog')
  listCatalog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('storeId') storeId?: string,
  ) {
    const allowed: MarketplaceCatalogSort[] = ['newest', 'price_asc', 'price_desc'];
    const sortKey = allowed.includes(sort as MarketplaceCatalogSort)
      ? (sort as MarketplaceCatalogSort)
      : 'newest';
    return this.marketplaceCatalog.listCatalog({
      page: Number(page || 1),
      limit: Number(limit || 24),
      categoryId,
      q,
      sort: sortKey,
      storeId,
    });
  }

  @Get('home')
  getHome() {
    return this.storefrontHome.getHomepage();
  }

  @Get('stores')
  listStores(@Query('featured') featured?: string) {
    return this.storefrontHome.listStores({
      featured: featured === '1' || featured === 'true',
    });
  }

  @Get('stores/:slug')
  async getStore(@Param('slug') slug: string) {
    const data = await this.storefrontHome.getStoreBySlug(slug);
    if (!data) throw new NotFoundException('Do‘kon topilmadi');
    return data;
  }

  /** Full storefront product for sheet/cart (legacy variants + listing price). */
  @Get('listings/:listingId/product')
  getListingProduct(@Param('listingId') listingId: string) {
    return this.listingProduct.getStorefrontProductByListingId(listingId);
  }
}
