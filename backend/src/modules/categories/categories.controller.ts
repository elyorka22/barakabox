import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import {
  AdminCategoryQueryDto,
  CreateCategoryDto,
  PublicCategoryProductsQueryDto,
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  listPublicCategories() {
    return this.categoriesService.listPublicCategories();
  }

  @Get(':slug/products')
  listCategoryProducts(@Param('slug') slug: string, @Query() query: PublicCategoryProductsQueryDto) {
    return this.categoriesService.listCategoryProducts(slug, query);
  }
}

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  listAdmin(@Query() query: AdminCategoryQueryDto) {
    return this.categoriesService.listAdmin(query);
  }

  @Post()
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.createAdminCategory(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.updateAdminCategory(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateCategoryStatusDto) {
    return this.categoriesService.updateAdminCategoryStatus(id, body.isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.deleteAdminCategory(id);
  }
}
