import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('home')
  homeSections() {
    return this.productsService.getHomepageSections();
  }

  @Get()
  list(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sort') sort?: string,
  ) {
    if (q?.trim()) {
      return this.productsService.search(q.trim(), Number(page || 1), Number(limit || 20));
    }
    const allowedSort = new Set(['newest', 'price_asc', 'price_desc']);
    return this.productsService.listPaginated({
      page: Number(page || 1),
      limit: Number(limit || 24),
      categoryId: categoryId?.trim() || undefined,
      sort: allowedSort.has(sort ?? '') ? (sort as 'newest' | 'price_asc' | 'price_desc') : 'newest',
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateProductDto) {
    const r = (user.role ?? '').toUpperCase();
    if (r === 'BUSINESS') {
      return this.productsService.createByBusinessOwner(user.sub, body);
    }
    if (!body.businessId) {
      throw new BadRequestException('businessId required');
    }
    return this.productsService.createByAdmin(body.businessId, body);
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
    const r = (user.role ?? '').toUpperCase();
    if (r === 'BUSINESS') {
      return this.productsService.updateByBusinessOwner(id, user.sub, body);
    }
    return this.productsService.updateByAdmin(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const r = (user.role ?? '').toUpperCase();
    if (r === 'BUSINESS') {
      return this.productsService.removeByBusinessOwner(id, user.sub);
    }
    return this.productsService.removeByAdmin(id);
  }
}
