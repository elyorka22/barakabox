import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CourierOrdersService } from './courier-orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { CustomersModule } from '../customers/customers.module';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { UsersModule } from '../users/users.module';
import { CouponsModule } from '../coupons/coupons.module';
import { SettingsModule } from '../settings/settings.module';
import { ScheduledOrdersCron } from './scheduled-orders.cron';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [CartModule, UsersModule, CustomersModule, CouponsModule, SettingsModule, AnalyticsModule],
  providers: [OrdersService, CourierOrdersService, QueueService, EventEmitterService, ScheduledOrdersCron],
  controllers: [OrdersController],
})
export class OrdersModule {}
