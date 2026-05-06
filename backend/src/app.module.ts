import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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
import { CategoriesModule } from './modules/categories/categories.module';
import { QueueService } from './infrastructure/queue/queue.service';
import { EventEmitterService } from './infrastructure/events/event-emitter.service';
import { CacheService } from './infrastructure/cache/cache.service';
import { validateEnv } from './infrastructure/config/env.validation';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AuthRateLimitMiddleware } from './common/middleware/auth-rate-limit.middleware';

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
  ],
  controllers: [AppController],
  providers: [QueueService, EventEmitterService, CacheService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
      );
  }
}
