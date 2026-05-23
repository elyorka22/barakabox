import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { StorefrontHomeService } from './storefront-home.service';
import { StorefrontListingProductService } from './storefront-listing-product.service';

/** Public marketplace storefront (additive homepage sections). */
@Controller('marketplace')
export class MarketplaceStorefrontController {
  constructor(
    private readonly storefrontHome: StorefrontHomeService,
    private readonly listingProduct: StorefrontListingProductService,
  ) {}

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
