import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { cacheKeys } from '../../common/cache/cache-keys';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      return value ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Cache get failed for key "${key}": ${message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = typeof ttlSeconds === 'number' ? ttlSeconds * 1000 : undefined;
      await this.cache.set(key, value, ttl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Cache set failed for key "${key}": ${message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Cache del failed for key "${key}": ${message}`);
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /** Bump catalog version so clients can skip stale section caches. */
  async bumpCatalogVersion(): Promise<number> {
    const key = 'storefront:catalog:version';
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, 86400);
    return next;
  }

  async invalidateMarketplaceStorefront(storeSlug?: string): Promise<void> {
    const keys = [
      cacheKeys.marketplaceHome(),
      cacheKeys.marketplaceStores(false),
      cacheKeys.marketplaceStores(true),
    ];
    for (const limit of [12, 15, 20, 24]) {
      keys.push(cacheKeys.productsTop(limit));
    }
    if (storeSlug?.trim()) {
      keys.push(cacheKeys.marketplaceStore(storeSlug.trim()));
    }
    await Promise.all(keys.map((k) => this.del(k)));
  }

  async invalidateStorefrontCatalog(storeSlug?: string): Promise<void> {
    await this.bumpCatalogVersion();
    const keys = [
      'storefront:products:home:v1',
      'storefront:products:top:v1:15',
      'storefront:banners:active:v1',
      'storefront:categories:v1:featured',
      'storefront:categories:v1:all',
    ];
    await Promise.all(keys.map((k) => this.del(k)));
    await this.invalidateMarketplaceStorefront(storeSlug);
  }
}
