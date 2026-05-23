import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { StoreAnalyticsQueryDto } from '../marketplace/dto/store-analytics.dto';
import { UpdateStoreTopProductsDto } from '../marketplace/dto/store-panel.dto';
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
