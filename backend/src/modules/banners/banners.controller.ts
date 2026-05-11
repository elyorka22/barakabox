import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BannersService } from './banners.service';
import {
  AdminBannerQueryDto,
  CreateBannerDto,
  PublicBannerQueryDto,
  ReorderBannersDto,
  UpdateBannerDto,
  UpdateBannerStatusDto,
} from './dto/banner.dto';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  listPublic(@Query() query: PublicBannerQueryDto) {
    return this.bannersService.listPublic(query);
  }
}

@Controller('admin/banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  listAdmin(@Query() query: AdminBannerQueryDto) {
    return this.bannersService.listAdmin(query);
  }

  @Post()
  create(@Body() body: CreateBannerDto) {
    return this.bannersService.create(body);
  }

  @Patch('reorder')
  reorder(@Body() body: ReorderBannersDto) {
    return this.bannersService.reorder(body.items ?? []);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateBannerDto) {
    return this.bannersService.update(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBannerStatusDto) {
    return this.bannersService.setStatus(id, body.isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
