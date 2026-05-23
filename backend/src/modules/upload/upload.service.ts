import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UploadMetricsService } from './upload-metrics.service';
import { SpacesObjectPrefix, SpacesService } from './spaces.service';

@Injectable()
export class UploadService {
  private static readonly RETRY_DELAYS_MS = [200, 400, 800];
  private static readonly MAX_RETRIES = 3;
  private readonly bucket: string;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerCooldownMs: number;
  private readonly halfOpenMaxRequests: number;
  private readonly monthlyStorageLimitBytes: number;
  private readonly blockOnCostLimit: boolean;
  private readonly orphanCleanupEnabled: boolean;
  private failedUploadOperations = 0;
  private circuitOpenedUntil = 0;
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private halfOpenInFlight = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly metrics: UploadMetricsService,
    private readonly spacesService: SpacesService,
  ) {
    this.bucket = this.spacesService.getBucketName();
    this.circuitBreakerThreshold = Number(
      this.configService.get<string>('UPLOAD_CIRCUIT_BREAKER_THRESHOLD') ?? '5',
    );
    this.circuitBreakerCooldownMs =
      Number(this.configService.get<string>('UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS') ?? '60') * 1000;
    this.halfOpenMaxRequests = Number(
      this.configService.get<string>('UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS') ?? '1',
    );
    this.monthlyStorageLimitBytes = Number(
      this.configService.get<string>('UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES') ?? '5368709120',
    );
    this.blockOnCostLimit =
      (this.configService.get<string>('UPLOAD_BLOCK_ON_COST_LIMIT') ?? 'true').toLowerCase() === 'true';
    this.orphanCleanupEnabled =
      (this.configService.get<string>('UPLOAD_ORPHAN_CLEANUP_ENABLED') ?? 'false').toLowerCase() === 'true';
  }

  private ensureCircuitClosed() {
    if (this.circuitState === 'OPEN' && this.circuitOpenedUntil > Date.now()) {
      throw new Error("Upload circuit breaker faol. Birozdan keyin qayta urinib ko'ring");
    }
    if (this.circuitState === 'OPEN' && this.circuitOpenedUntil <= Date.now()) {
      this.circuitState = 'HALF_OPEN';
      this.halfOpenInFlight = 0;
    }
    if (this.circuitState === 'HALF_OPEN' && this.halfOpenInFlight >= this.halfOpenMaxRequests) {
      throw new Error("Upload circuit breaker HALF_OPEN holatida, keyinroq urinib ko'ring");
    }
  }

  private markUploadSuccess() {
    this.failedUploadOperations = 0;
    this.circuitOpenedUntil = 0;
    this.circuitState = 'CLOSED';
    this.halfOpenInFlight = 0;
  }

  private async markUploadFailure() {
    this.failedUploadOperations += 1;
    await this.recordUploadError();
    if (this.failedUploadOperations >= this.circuitBreakerThreshold) {
      this.circuitState = 'OPEN';
      this.circuitOpenedUntil = Date.now() + this.circuitBreakerCooldownMs;
      this.halfOpenInFlight = 0;
    }
  }

  private async withRetry<T>(operation: string, payload: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= UploadService.RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === UploadService.RETRY_DELAYS_MS.length) {
          await this.trackFailedJob(operation, payload, error);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, UploadService.RETRY_DELAYS_MS[attempt]));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Retry failed');
  }

  buildKeys(productId: string): {
    main: { key: string; publicUrl: string };
    card: { key: string; publicUrl: string };
    thumb: { key: string; publicUrl: string };
  } {
    const id = randomUUID();
    const ts = Date.now();
    const mainKey = `products/${productId}/${ts}-${id}-main.jpg`;
    const cardKey = `products/${productId}/${ts}-${id}-card.jpg`;
    const thumbKey = `products/${productId}/${ts}-${id}-thumb.jpg`;
    return {
      main: { key: mainKey, publicUrl: this.spacesService.buildPublicUrl(mainKey) },
      card: { key: cardKey, publicUrl: this.spacesService.buildPublicUrl(cardKey) },
      thumb: { key: thumbKey, publicUrl: this.spacesService.buildPublicUrl(thumbKey) },
    };
  }

  async uploadProductImage(productId: string, file: Express.Multer.File) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, imageKey: true },
    });
    if (!product) {
      throw new Error('Product not found');
    }
    const id = randomUUID();
    const ts = Date.now();
    const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const key = `products/${productId}/${ts}-${id}.${extension}`;
    const uploaded = await this.spacesService.uploadBuffer({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    if (product.imageKey && product.imageKey !== key) {
      await this.deleteImage(product.imageKey).catch(() => undefined);
    }
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: uploaded.url,
        imageKey: uploaded.key,
      },
    });
    return uploaded;
  }

  async uploadImageForForm(file: Express.Multer.File, folder: SpacesObjectPrefix = 'products') {
    const id = randomUUID();
    const ts = Date.now();
    const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const prefix =
      folder === 'products' ? 'products/temp' : folder;
    const key = `${prefix}/${ts}-${id}.${extension}`;
    return this.spacesService.uploadBuffer({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000, immutable',
    });
  }

  /** Store logo or banner — stored under `stores/{storeId}/` on S3-compatible object storage. */
  async uploadStoreImage(
    storeId: string,
    kind: 'logo' | 'banner',
    file: Express.Multer.File,
  ) {
    const id = randomUUID();
    const ts = Date.now();
    const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const key = `stores/${storeId}/${kind}-${ts}-${id}.${extension}`;
    return this.spacesService.uploadBuffer({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000, immutable',
    });
  }

  async deleteImageByUrl(url: string | null | undefined): Promise<void> {
    const key = this.extractObjectKeyFromUrl(url ?? '', this.bucket);
    if (!key) return;
    await this.deleteImage(key);
  }

  async runSpacesDebugUpload() {
    return this.spacesService.testUploadConnectivity();
  }

  async createPresignedUpload(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; headers: Record<string, string> }> {
    this.ensureCircuitClosed();
    if (this.circuitState === 'HALF_OPEN') {
      this.halfOpenInFlight += 1;
    }
    const cacheControl = 'public, max-age=31536000, immutable';
    try {
      const upload = await this.spacesService.createPresignedUpload(key, contentType, cacheControl);
      this.markUploadSuccess();
      return upload;
    } catch (error) {
      await this.markUploadFailure();
      throw error;
    } finally {
      if (this.circuitState === 'HALF_OPEN' && this.halfOpenInFlight > 0) {
        this.halfOpenInFlight -= 1;
      }
    }
  }

  recordUpload(sizeInBytes: number) {
    this.metrics.recordSuccess(sizeInBytes);
  }

  async recordUploadError() {
    await this.metrics.recordError();
  }

  async getMetrics() {
    return this.metrics.getSnapshot();
  }

  async getPrometheusMetrics() {
    return this.metrics.getPrometheusMetrics();
  }

  async deleteImage(key: string): Promise<void> {
      await this.withRetry('DELETE', { key }, async () => {
      await this.spacesService.deleteObject(key);
    });
  }

  /** Off by default (UPLOAD_ORPHAN_CLEANUP_ENABLED). Never deletes DB rows — only Spaces objects. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOrphanImages(): Promise<void> {
    if (!this.orphanCleanupEnabled) {
      return;
    }
    try {
      const knownKeys = await this.collectReferencedObjectKeys();

      let continuationToken: string | undefined;
      do {
        const listed = await this.spacesService.listObjects('products/', continuationToken);
        for (const object of listed.Contents ?? []) {
          if (!object.Key) continue;
          if (!knownKeys.has(object.Key)) {
            await this.withRetry('CLEANUP', { key: object.Key }, async () => this.deleteImage(object.Key!));
          }
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    } catch {
      await this.metrics.recordCleanupFailure();
    }
  }

  private async collectReferencedObjectKeys(): Promise<Set<string>> {
    const knownKeys = new Set<string>();
    const bucket = this.bucket;

    const addKeyFromUrl = (url: string | null | undefined) => {
      if (!url?.trim()) return;
      const key = this.extractObjectKeyFromUrl(url, bucket);
      if (key) knownKeys.add(key);
    };

    const [products, assets, sessions, variants, categories, banners, stores] = await Promise.all([
      this.prisma.product.findMany({
        select: { imageKey: true, imageCardKey: true, imageThumbKey: true },
      }),
      this.prisma.productImageAsset.findMany({
        select: { mainKey: true, cardKey: true, thumbKey: true },
      }),
      this.prisma.uploadSession.findMany({
        select: { mainKey: true, cardKey: true, thumbKey: true },
      }),
      this.prisma.productVariant.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
      }),
      this.prisma.category.findMany({ select: { imageUrl: true } }),
      this.prisma.banner.findMany({ select: { imageUrl: true } }),
      this.prisma.store.findMany({ select: { logoUrl: true, bannerUrl: true } }),
    ]);

    for (const product of products) {
      if (product.imageKey) knownKeys.add(product.imageKey);
      if (product.imageCardKey) knownKeys.add(product.imageCardKey);
      if (product.imageThumbKey) knownKeys.add(product.imageThumbKey);
    }
    for (const asset of assets) {
      knownKeys.add(asset.mainKey);
      knownKeys.add(asset.cardKey);
      knownKeys.add(asset.thumbKey);
    }
    for (const session of sessions) {
      knownKeys.add(session.mainKey);
      knownKeys.add(session.cardKey);
      knownKeys.add(session.thumbKey);
    }
    for (const variant of variants) {
      addKeyFromUrl(variant.imageUrl);
    }
    for (const category of categories) {
      addKeyFromUrl(category.imageUrl);
    }
    for (const banner of banners) {
      addKeyFromUrl(banner.imageUrl);
    }
    for (const store of stores) {
      addKeyFromUrl(store.logoUrl);
      addKeyFromUrl(store.bannerUrl);
    }

    return knownKeys;
  }

  private extractObjectKeyFromUrl(url: string, bucket: string): string | null {
    try {
      const parsed = new URL(url);
      let path = parsed.pathname.replace(/^\//, '');
      if (!path) return null;
      if (path.startsWith(`${bucket}/`)) {
        path = path.slice(bucket.length + 1);
      }
      const allowed = ['products/', 'categories/', 'banners/', 'users/', 'stores/', 'debug/'];
      if (allowed.some((prefix) => path.startsWith(prefix))) {
        return path;
      }
      if (parsed.hostname.includes('digitaloceanspaces.com')) {
        return path || null;
      }
      const cdnBase = this.spacesService.getPublicBaseUrl();
      if (cdnBase && url.startsWith(cdnBase)) {
        return path || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async createUploadSession(input: {
    productId: string;
    mainUrl: string;
    mainKey: string;
    cardUrl: string;
    cardKey: string;
    thumbUrl: string;
    thumbKey: string;
    mainSize: number;
    cardSize: number;
    thumbSize: number;
  }) {
    this.ensureCircuitClosed();
    const monthly = await this.getCurrentMonthStorageUsage();
    const incomingBytes = input.mainSize + input.cardSize + input.thumbSize;
    if (this.blockOnCostLimit && monthly + incomingBytes > this.monthlyStorageLimitBytes) {
      throw new Error('Monthly storage limit exceeded, uploads temporarily blocked');
    }
    const maxImages = 5;
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });
    if (!product) {
      throw new Error('Product not found');
    }
    const assetsCount = await this.prisma.productImageAsset.count({
      where: { productId: input.productId },
    });
    if (assetsCount >= maxImages) {
      throw new Error('Max images per product reached');
    }
    const existing = await this.prisma.uploadSession.findUnique({
      where: { productId: input.productId },
    });
    if (existing && existing.expiresAt > new Date()) {
      throw new Error('Upload already in progress for this product');
    }
    if (existing) {
      await this.prisma.uploadSession.delete({ where: { productId: input.productId } });
    }
    const session = await this.prisma.uploadSession.create({
      data: {
        ...input,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    return session;
  }

  async finalizeUpload(sessionId: string) {
    this.ensureCircuitClosed();
    const session = await this.withRetry('FINALIZE', { sessionId }, async () =>
      this.prisma.uploadSession.findUnique({
        where: { id: sessionId },
      }),
    );
    if (!session) {
      throw new Error('Upload session not found');
    }
    if (session.expiresAt < new Date()) {
      await this.prisma.uploadSession.delete({ where: { id: session.id } });
      throw new Error('Upload session expired');
    }
    for (const key of [session.mainKey, session.cardKey, session.thumbKey]) {
      await this.withRetry('FINALIZE', { sessionId, key }, async () => {
        await this.spacesService.headObject(key);
      });
    }

    return this.withRetry('FINALIZE', { sessionId }, async () => this.prisma.$transaction(async (tx) => {
      await tx.productImageAsset.create({
        data: {
          productId: session.productId,
          mainUrl: session.mainUrl,
          mainKey: session.mainKey,
          cardUrl: session.cardUrl,
          cardKey: session.cardKey,
          thumbUrl: session.thumbUrl,
          thumbKey: session.thumbKey,
          totalBytes: session.mainSize + session.cardSize + session.thumbSize,
        },
      });
      const product = await tx.product.update({
        where: { id: session.productId },
        data: {
          imageUrl: session.mainUrl,
          imageKey: session.mainKey,
          imageCardUrl: session.cardUrl,
          imageCardKey: session.cardKey,
          imageThumbUrl: session.thumbUrl,
          imageThumbKey: session.thumbKey,
        },
      });
      await tx.uploadSession.delete({ where: { id: session.id } });
      this.markUploadSuccess();
      return product;
    }));
  }

  listUploadSessions() {
    return this.prisma.uploadSession.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async forceCloseSession(sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Upload session not found');
    }
    await this.prisma.uploadSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async listFailedJobs() {
    return this.prisma.failedUploadJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async deleteFailedJob(jobId: string) {
    const job = await this.prisma.failedUploadJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Failed job not found');
    }
    await this.prisma.failedUploadJob.delete({ where: { id: jobId } });
    return { success: true };
  }

  async retryFailedJob(jobId: string) {
    const job = await this.prisma.failedUploadJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Failed job not found');
    }
    if (job.retryCount >= UploadService.MAX_RETRIES || job.status === 'FAILED') {
      throw new Error('Max retries exceeded for this job');
    }
    const nextRetryCount = job.retryCount + 1;
    await this.prisma.failedUploadJob.update({
      where: { id: jobId },
      data: { status: 'RETRYING', retryCount: { increment: 1 }, lastTriedAt: new Date() },
    });
    try {
      await this.executeFailedJob(job);
      await this.prisma.failedUploadJob.update({
        where: { id: jobId },
        data: { status: 'RESOLVED', error: 'Retry succeeded' },
      });
      this.metrics.recordRetrySuccess();
      return { success: true, status: 'RESOLVED' as const };
    } catch (error) {
      const failedStatus = nextRetryCount >= UploadService.MAX_RETRIES ? 'FAILED' : 'PENDING';
      await this.prisma.failedUploadJob.update({
        where: { id: jobId },
        data: {
          status: failedStatus,
          error: error instanceof Error ? error.message : 'Retry failed',
        },
      });
      this.metrics.recordRetryFailure();
      await this.logAudit({
        userId: 'system-retry',
        action: 'RETRY',
        objectKey: typeof job.payload === 'object' && job.payload ? JSON.stringify(job.payload) : undefined,
      });
      throw error;
    }
  }

  async getStorageUsage() {
    const byProduct = await this.prisma.productImageAsset.groupBy({
      by: ['productId'],
      _sum: { totalBytes: true },
      _count: { _all: true },
    });
    const products = await this.prisma.product.findMany({
      where: { id: { in: byProduct.map((item) => item.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const items = byProduct.map((item) => ({
      productId: item.productId,
      productName: nameById.get(item.productId) ?? item.productId,
      totalBytes: item._sum.totalBytes ?? 0,
      imagesCount: item._count._all,
    }));
    const totalBytes = items.reduce((sum, item) => sum + item.totalBytes, 0);
    const monthlyBytes = await this.getCurrentMonthStorageUsage();
    const monthlyPercent = this.monthlyStorageLimitBytes > 0
      ? Number(((monthlyBytes / this.monthlyStorageLimitBytes) * 100).toFixed(2))
      : 0;
    return {
      totalBytes,
      items,
      monthlyBytes,
      monthlyLimitBytes: this.monthlyStorageLimitBytes,
      monthlyPercent,
      blockedByCostGuard: this.blockOnCostLimit && monthlyBytes >= this.monthlyStorageLimitBytes,
    };
  }

  async checkHealth() {
    try {
      const spaces = await this.spacesService.checkBucketHealth();
      return {
        ok: true,
        spacesConnectivity: 'ok',
        bucketAccess: 'ok',
        bucket: spaces.bucket,
        publicBaseUrl: spaces.publicBaseUrl,
        orphanCleanupEnabled: this.orphanCleanupEnabled,
        circuitState: this.circuitState,
        circuitBreakerOpen: this.circuitState === 'OPEN' && this.circuitOpenedUntil > Date.now(),
        circuitOpenedUntil: this.circuitOpenedUntil > Date.now() ? new Date(this.circuitOpenedUntil).toISOString() : null,
      };
    } catch (error) {
      await this.markUploadFailure();
      return {
        ok: false,
        spacesConnectivity: 'failed',
        bucketAccess: 'failed',
        error: error instanceof Error ? error.message : 'unknown',
        circuitState: this.circuitState,
        circuitBreakerOpen: this.circuitState === 'OPEN' && this.circuitOpenedUntil > Date.now(),
        circuitOpenedUntil: this.circuitOpenedUntil > Date.now() ? new Date(this.circuitOpenedUntil).toISOString() : null,
      };
    }
  }

  async logAudit(params: {
    userId: string;
    productId?: string;
    action: 'PRESIGN' | 'FINALIZE' | 'DELETE' | 'LEGACY_UPLOAD' | 'RETRY';
    objectKey?: string;
  }) {
    try {
      await this.prisma.uploadAuditLog.create({
        data: {
          userId: params.userId,
          productId: params.productId,
          action: params.action,
          objectKey: params.objectKey,
        },
      });
    } catch {
      // do not break upload flow because of audit log failures
    }
  }

  private async getCurrentMonthStorageUsage(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthly = await this.prisma.productImageAsset.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { totalBytes: true },
    });
    return monthly._sum.totalBytes ?? 0;
  }

  private async trackFailedJob(operation: string, payload: unknown, error: unknown) {
    const normalizedPayload = (payload ?? {}) as object;
    const existing = await this.prisma.failedUploadJob.findFirst({
      where: {
        operation,
        status: { in: ['PENDING', 'RETRYING'] },
        payload: { equals: normalizedPayload },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return;
    }
    await this.prisma.failedUploadJob.create({
      data: {
        operation,
        payload: normalizedPayload,
        error: error instanceof Error ? error.message : 'unknown error',
      },
    });
  }

  private async executeFailedJob(job: {
    operation: string;
    payload: unknown;
  }) {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    if (job.operation === 'FINALIZE') {
      const sessionId = String(payload.sessionId ?? '');
      return this.retryFinalize(sessionId);
    }
    if (job.operation === 'DELETE') {
      const key = String(payload.key ?? '');
      return this.retryDelete(key);
    }
    if (job.operation === 'CLEANUP') {
      const key = String(payload.key ?? '');
      return this.retryCleanup(key);
    }
    throw new Error(`Unsupported retry operation: ${job.operation}`);
  }

  async retryFinalize(sessionId: string) {
    if (!sessionId) {
      throw new Error('Missing sessionId');
    }
    const session = await this.prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return { success: true, idempotent: true };
    }
    try {
      await this.finalizeUpload(sessionId);
      await this.logAudit({
        userId: 'system-retry',
        productId: session.productId,
        action: 'RETRY',
        objectKey: session.mainKey,
      });
      return { success: true };
    } catch (error) {
      // If finalize already applied and session disappeared during race, treat as idempotent success.
      const recheckSession = await this.prisma.uploadSession.findUnique({ where: { id: sessionId } });
      if (!recheckSession) {
        return { success: true, idempotent: true };
      }
      throw error;
    }
  }

  async retryDelete(key: string) {
    if (!key) {
      throw new Error('Missing key');
    }
    try {
      await this.deleteImage(key);
    } catch {
      // Deleting missing object is idempotent success in recovery path.
    }
    await this.logAudit({
      userId: 'system-retry',
      action: 'RETRY',
      objectKey: key,
    });
    return { success: true, idempotent: true };
  }

  async retryCleanup(key: string) {
    if (!key) {
      throw new Error('Missing key');
    }
    return this.retryDelete(key);
  }
}
