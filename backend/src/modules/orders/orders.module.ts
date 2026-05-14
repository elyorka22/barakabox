import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { CustomersModule } from '../customers/customers.module';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CartModule, UsersModule, CustomersModule],
  providers: [OrdersService, QueueService, EventEmitterService],
  controllers: [OrdersController],
})
export class OrdersModule {}
