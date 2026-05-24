import { Module } from '@nestjs/common';
import { BusinessStoreCatalogController } from './business-store-catalog.controller';
import { MarketplaceAdminController } from './marketplace-admin.controller';
import { MarketplaceStorefrontController } from './marketplace-storefront.controller';
import { StorefrontStoresController } from './storefront-stores.controller';
import { StorefrontStoresService } from './storefront-stores.service';
import { StorefrontHomeService } from './storefront-home.service';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AppCacheModule } from '../../infrastructure/cache/cache.module';
import { ProductsModule } from '../products/products.module';
import { UploadModule } from '../upload/upload.module';
import { GlobalCatalogAdminService } from './global-catalog-admin.service';
import { MarketplaceSearchController } from './marketplace-search.controller';
import { StorefrontSearchService } from './storefront-search.service';
import { StorefrontListingProductService } from './storefront-listing-product.service';
import { MarketplaceMigrationService } from './marketplace-migration.service';
import { StoreCatalogService } from './store-catalog.service';
import { StoreContextService } from './store-context.service';
import { StoreAnalyticsService } from './store-analytics.service';
import { StoreAdminService } from './store-admin.service';

/**
 * Multi-store marketplace (additive). Does not replace ProductsModule yet.
 */
@Module({
  imports: [DatabaseModule, AppCacheModule, ProductsModule, UploadModule],
  controllers: [
    MarketplaceAdminController,
    MarketplaceStorefrontController,
    StorefrontStoresController,
    MarketplaceSearchController,
    BusinessStoreCatalogController,
  ],
  providers: [
    MarketplaceCatalogService,
    GlobalCatalogAdminService,
    MarketplaceMigrationService,
    StoreCatalogService,
    StoreContextService,
    StorefrontHomeService,
    StorefrontStoresService,
    StorefrontSearchService,
    StorefrontListingProductService,
    StoreAnalyticsService,
    StoreAdminService,
  ],
  exports: [
    MarketplaceCatalogService,
    GlobalCatalogAdminService,
    MarketplaceMigrationService,
    StoreCatalogService,
    StoreContextService,
    StorefrontHomeService,
    StorefrontStoresService,
    StorefrontSearchService,
    StoreAnalyticsService,
    StoreAdminService,
  ],
})
export class MarketplaceModule {}
