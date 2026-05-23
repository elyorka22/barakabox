import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { OrdersModule } from '../orders/orders.module';
import { BusinessesController } from './businesses.controller';
import { BusinessStorePanelController } from './business-store-panel.controller';
import { BusinessStoreStaffController } from './business-store-staff.controller';
import { BusinessesService } from './businesses.service';
import { BusinessStoreStaffService } from './business-store-staff.service';
import { BusinessDashboardService } from './business-dashboard.service';
import { StorePanelService } from './store-panel.service';
import { StorePanelOrdersService } from './store-panel-orders.service';

@Module({
  imports: [UsersModule, MarketplaceModule, OrdersModule],
  controllers: [
    BusinessesController,
    BusinessStoreStaffController,
    BusinessStorePanelController,
  ],
  providers: [
    BusinessesService,
    BusinessStoreStaffService,
    BusinessDashboardService,
    StorePanelService,
    StorePanelOrdersService,
  ],
  exports: [BusinessesService, BusinessDashboardService, StorePanelService],
})
export class BusinessesModule {}
