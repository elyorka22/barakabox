import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateGlobalProductDto,
  CreateGlobalVariantDto,
  CreateStoreListingDto,
  UpdateGlobalProductDto,
  UpdateStoreListingDto,
} from './dto/global-catalog.dto';
import { GlobalCatalogAdminService } from './global-catalog-admin.service';
import { MarketplaceMigrationService } from './marketplace-migration.service';
import { StoreCatalogService } from './store-catalog.service';
import { StoreAnalyticsQueryDto } from './dto/store-analytics.dto';
import { StoreAnalyticsService } from './store-analytics.service';
import { StoreAdminService } from './store-admin.service';
import { UpdateStoreDto } from './dto/store-admin.dto';
import { StoreContextService } from './store-context.service';

class RunMarketplaceMigrationDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

class StoreImageKindDto {
  @IsIn(['logo', 'banner'])
  kind!: 'logo' | 'banner';
}

@Controller('admin/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MarketplaceAdminController {
  constructor(
    private readonly storeContext: StoreContextService,
    private readonly globalCatalog: GlobalCatalogAdminService,
    private readonly storeCatalog: StoreCatalogService,
    private readonly migration: MarketplaceMigrationService,
    private readonly storeAnalytics: StoreAnalyticsService,
    private readonly storeAdmin: StoreAdminService,
  ) {}

  @Get('stores')
  listStores() {
    return this.storeContext.listStoresForAdmin();
  }

  @Get('stores/:storeId')
  getStore(@Param('storeId') storeId: string) {
    return this.storeAdmin.getStore(storeId);
  }

  @Patch('stores/:storeId')
  updateStore(@Param('storeId') storeId: string, @Body() dto: UpdateStoreDto) {
    return this.storeAdmin.updateStore(storeId, dto);
  }

  @Post('stores/:storeId/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(new BadRequestException('Faqat jpg/png/webp'), false);
        }
        callback(null, true);
      },
    }),
  )
  uploadStoreImage(
    @Param('storeId') storeId: string,
    @Query() query: StoreImageKindDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Rasm fayli kerak');
    }
    return this.storeAdmin.uploadStoreImage(storeId, query.kind, file);
  }

  @Get('analytics')
  platformAnalytics(@Query() query: StoreAnalyticsQueryDto) {
    return this.storeAnalytics.getPlatformAnalytics(query.period);
  }

  @Get('stores/:storeId/analytics')
  getStoreAnalytics(@Param('storeId') storeId: string, @Query() query: StoreAnalyticsQueryDto) {
    return this.storeAnalytics.getStoreAnalytics(storeId, query.period);
  }

  /** Idempotent legacy → marketplace backfill (SUPER_ADMIN / ADMIN only). */
  @Post('migrate')
  @Roles('SYSTEM_ADMIN')
  runMigration(@Body() body: RunMarketplaceMigrationDto) {
    return this.migration.run(body.dryRun === true);
  }

  @Get('global-products')
  listGlobalProducts(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.globalCatalog.listGlobalProducts({
      q,
      categoryId: categoryId?.trim() || undefined,
      page: Number(page || 1),
      limit: Number(limit || 24),
      includeInactive: includeInactive === '1' || includeInactive === 'true',
    });
  }

  @Post('global-products')
  createGlobalProduct(@Body() dto: CreateGlobalProductDto) {
    return this.globalCatalog.createGlobalProduct(dto);
  }

  @Patch('global-products/:id')
  updateGlobalProduct(@Param('id') id: string, @Body() dto: UpdateGlobalProductDto) {
    return this.globalCatalog.updateGlobalProduct(id, dto);
  }

  @Post('global-products/:id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateGlobalVariantDto) {
    return this.globalCatalog.addVariant(id, dto);
  }

  @Get('stores/:storeId/listings')
  listStoreListings(@Param('storeId') storeId: string) {
    return this.storeCatalog.listStoreListings(storeId);
  }

  @Get('stores/:storeId/browse')
  browseForStore(
    @Param('storeId') storeId: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storeCatalog.browseGlobalCatalog(storeId, {
      q,
      categoryId: categoryId?.trim() || undefined,
      page: Number(page || 1),
      limit: Number(limit || 20),
    });
  }

  @Post('stores/:storeId/listings')
  createStoreListing(@Param('storeId') storeId: string, @Body() dto: CreateStoreListingDto) {
    return this.storeCatalog.createListing(storeId, dto);
  }

  @Patch('stores/:storeId/listings/:listingId')
  updateStoreListing(
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateStoreListingDto,
  ) {
    return this.storeCatalog.updateListing(storeId, listingId, dto);
  }
}
