import { CacheModule } from '@nestjs/cache-manager';
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheService } from './cache.service';

const logger = new Logger('AppCacheModule');

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
        const port = Number(configService.get<string>('REDIS_PORT') ?? '6379');
        const password = configService.get<string>('REDIS_PASSWORD');

        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const redisUrl = `redis://${auth}${host}:${port}`;

        const stores: Keyv[] = [new Keyv()];
        try {
          stores.unshift(new Keyv({ store: new KeyvRedis(redisUrl) }));
          logger.log(`CacheModule configured with Redis store (${host}:${port})`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown';
          logger.warn(`Redis cache store init failed, falling back to memory cache: ${message}`);
        }

        return {
          stores,
          ttl: 60_000,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class AppCacheModule {}
