import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { BoxesModule } from './modules/boxes/boxes.module';
import { AdminModule } from './modules/admin/admin.module';
import { QueueService } from './infrastructure/queue/queue.service';
import { EventEmitterService } from './infrastructure/events/event-emitter.service';
import { CacheService } from './infrastructure/cache/cache.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    BusinessesModule,
    BoxesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [QueueService, EventEmitterService, CacheService],
})
export class AppModule {}
