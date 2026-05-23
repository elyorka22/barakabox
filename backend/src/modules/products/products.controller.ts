import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { isStoreOperatorRole } from '../../common/roles';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateTopProductsDto } from './dto/update-top-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('home')
  homeSections() {
    return this.productsService.getHomepageSections();
  }

  @Get('promotions')
  listPromotions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    const allowedSort = new Set(['newest', 'discount_desc']);
    return this.productsService.listPromotionsPaginated({
      page: Number(page || 1),
      limit: Number(limit || 24),
      sort: allowedSort.has(sort ?? '') ? (sort as 'newest' | 'discount_desc') : 'discount_desc',
    });
  }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('businessId') businessId?: string,
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    const allowedSort = new Set(['newest', 'price_asc', 'price_desc']);
    const term = (search ?? q)?.trim();
    return this.productsService.listPaginated({
      page: Number(page || 1),
      limit: Number(limit || 24),
      categoryId: categoryId?.trim() || undefined,
      businessId: businessId?.trim() || undefined,
      search: term || undefined,
      sort: allowedSort.has(sort ?? '') ? (sort as 'newest' | 'price_asc' | 'price_desc') : 'newest',
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateProductDto) {
    if (isStoreOperatorRole(user.role)) {
      return this.productsService.createByBusinessOwner(user.sub, body);
    }
    if (!body.businessId) {
      throw new BadRequestException('businessId required');
    }
    return this.productsService.createByAdmin(body.businessId, body);
  }

  @Get('admin/top-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listTopForAdmin() {
    return this.productsService.listTopProductsForAdmin();
  }

  @Patch('admin/top-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTopForAdmin(@Body() body: UpdateTopProductsDto) {
    return this.productsService.updateTopProductsBulk(body.items);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('stockFilter') stockFilter?: string,
    @Query('sortBy') sortBy?: string,
    @Query('businessId') businessId?: string,
  ) {
    const allowedStock = new Set(['all', 'in_stock', 'low', 'out']);
    const allowedSort = new Set(['newest', 'stock_asc', 'stock_desc', 'price_asc', 'price_desc']);
    return this.productsService.listForAdmin({
      page: Number(page || 1),
      limit: Number(limit || 50),
      q,
      categoryId: categoryId && categoryId !== 'ALL' ? categoryId : undefined,
      includeInactive: includeInactive === '1' || includeInactive === 'true',
      stockFilter: allowedStock.has(stockFilter ?? '') ? (stockFilter as 'all' | 'in_stock' | 'low' | 'out') : 'all',
      sortBy: allowedSort.has(sortBy ?? '') ? (sortBy as 'newest' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc') : 'newest',
      businessId: businessId && businessId !== 'ALL' ? businessId : undefined,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  listMine(@CurrentUser() user: AuthUser) {
    return this.productsService.listMine(user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
  ) {
    if (isStoreOperatorRole(user.role)) {
      return this.productsService.updateByBusinessOwner(id, user.sub, body);
    }
    return this.productsService.updateByAdmin(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (isStoreOperatorRole(user.role)) {
      return this.productsService.removeByBusinessOwner(id, user.sub);
    }
    return this.productsService.removeByAdmin(id);
  }
}
