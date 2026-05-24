import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  BulkImportStoreListingsDto,
  CreateStoreListingDto,
  UpdateStoreListingDto,
} from './dto/global-catalog.dto';
import { StoreCatalogService } from './store-catalog.service';

/** Store operator: browse global catalog and manage store listings (Stage 3). */
@Controller('businesses/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUSINESS')
export class BusinessStoreCatalogController {
  constructor(private readonly storeCatalog: StoreCatalogService) {}

  @Get('browse')
  async browse(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const store = await this.storeCatalog.resolveStoreForOperator(user.sub, user.role);
    return this.storeCatalog.browseGlobalCatalog(store.id, {
      q,
      categoryId: categoryId?.trim() || undefined,
      page: Number(page || 1),
      limit: Number(limit || 20),
    });
  }

  @Get('listings')
  async listings(@CurrentUser() user: AuthUser) {
    const store = await this.storeCatalog.resolveStoreForOperator(user.sub, user.role);
    return this.storeCatalog.listStoreListings(store.id);
  }

  @Post('listings')
  async addListing(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreListingDto) {
    const store = await this.storeCatalog.resolveStoreForOperator(user.sub, user.role);
    return this.storeCatalog.createListing(store.id, dto);
  }

  @Post('listings/bulk')
  async bulkImport(@CurrentUser() user: AuthUser, @Body() dto: BulkImportStoreListingsDto) {
    const store = await this.storeCatalog.resolveStoreForOperator(user.sub, user.role);
    return this.storeCatalog.bulkImportListings(store.id, dto);
  }

  @Patch('listings/:id')
  async updateListing(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStoreListingDto,
  ) {
    const store = await this.storeCatalog.resolveStoreForOperator(user.sub, user.role);
    return this.storeCatalog.updateListing(store.id, id, dto);
  }
}
