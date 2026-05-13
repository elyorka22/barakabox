import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
    const port = Number(this.configService.get<string>('REDIS_PORT') ?? '6379');
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      reconnectOnError: (err) => (err.message.includes('READONLY') ? 1 : false),
    });

    this.client.on('connect', () => {
      this.logger.log(`Redis connected (${host}:${port})`);
    });
    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });
    this.client.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    this.client.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Redis connection issue: ${message}`);
    });
    this.client.on('end', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.ping();
      this.logger.log('Redis health check passed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Redis unavailable on boot, running without Redis cache: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
