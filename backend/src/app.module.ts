import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CategoriesModule } from './modules/categories/categories.module';
import { BannersModule } from './modules/banners/banners.module';
import { UploadModule } from './modules/upload/upload.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { QueueService } from './infrastructure/queue/queue.service';
import { EventEmitterService } from './infrastructure/events/event-emitter.service';
import { validateEnv } from './infrastructure/config/env.validation';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env',
      validate: validateEnv,
    }),
    JwtModule.register({ global: true }),
    RedisModule,
    AppCacheModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    BusinessesModule,
    BoxesModule,
    AdminModule,
    CategoriesModule,
    BannersModule,
    UploadModule,
    CustomersModule,
    SettingsModule,
    CouponsModule,
    AnalyticsModule,
    MarketplaceModule,
  ],
  controllers: [AppController],
  providers: [
    QueueService,
    EventEmitterService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
