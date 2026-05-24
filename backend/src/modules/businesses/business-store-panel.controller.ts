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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { StoreAnalyticsQueryDto } from '../marketplace/dto/store-analytics.dto';
import { UpdateStoreTopProductsDto } from '../marketplace/dto/store-panel.dto';
import { UpdateStoreProfileDto } from '../marketplace/dto/store-profile.dto';
import { StoreAnalyticsService } from '../marketplace/store-analytics.service';
import { StorePanelOrdersQueryDto } from './dto/store-panel-orders.dto';
import { StorePanelOrdersService } from './store-panel-orders.service';
import { StorePanelService } from './store-panel.service';

@Controller('businesses/panel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUSINESS')
export class BusinessStorePanelController {
  constructor(
    private readonly panel: StorePanelService,
    private readonly storeAnalytics: StoreAnalyticsService,
    private readonly storeOrders: StorePanelOrdersService,
  ) {}

  @Get('store')
  getStore(@CurrentUser() user: AuthUser) {
    return this.panel.getStoreContext(user.sub, user.role);
  }

  @Get('onboarding')
  getOnboarding(@CurrentUser() user: AuthUser) {
    return this.panel.getOnboardingStatus(user.sub, user.role);
  }

  @Patch('store')
  updateStore(@CurrentUser() user: AuthUser, @Body() dto: UpdateStoreProfileDto) {
    return this.panel.updateStoreProfile(user.sub, user.role, dto);
  }

  @Post('store/image')
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
    @CurrentUser() user: AuthUser,
    @Query('kind') kind: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (kind !== 'logo' && kind !== 'banner') {
      throw new BadRequestException('kind=logo yoki banner');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Rasm fayli kerak');
    }
    return this.panel.uploadStoreImage(user.sub, user.role, kind, file);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.panel.getDashboard(user.sub, user.role);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser() user: AuthUser, @Query() query: StoreAnalyticsQueryDto) {
    return this.storeAnalytics.getAnalyticsForOperator(user.sub, user.role, query.period);
  }

  @Get('orders/summary')
  getOrdersSummary(@CurrentUser() user: AuthUser) {
    return this.storeOrders.getSummary(user.sub, user.role);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser, @Query() query: StorePanelOrdersQueryDto) {
    return this.storeOrders.listOrders(user.sub, user.role, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      q: query.q,
    });
  }

  @Get('orders/:orderId')
  getOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.storeOrders.getOrder(user.sub, user.role, orderId);
  }

  @Get('listings')
  listListings(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('visible') visible?: string,
  ) {
    const visibleFilter =
      visible === 'visible' || visible === 'hidden' ? visible : 'all';
    return this.panel.listListings(user.sub, user.role, { q, visible: visibleFilter });
  }

  @Get('inventory')
  getInventory(@CurrentUser() user: AuthUser) {
    return this.panel.getInventory(user.sub, user.role);
  }

  @Get('top')
  getTop(@CurrentUser() user: AuthUser) {
    return this.panel.getTopListings(user.sub, user.role);
  }

  @Patch('top')
  updateTop(@CurrentUser() user: AuthUser, @Body() body: UpdateStoreTopProductsDto) {
    return this.panel.updateTopListings(user.sub, user.role, body.items);
  }
}
