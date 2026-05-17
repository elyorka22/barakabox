import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Allowed top-level object prefixes — single bucket, folder-based layout. */
export const SPACES_OBJECT_PREFIXES = ['products', 'categories', 'banners', 'users', 'debug'] as const;
export type SpacesObjectPrefix = (typeof SPACES_OBJECT_PREFIXES)[number];

@Injectable()
export class SpacesService implements OnModuleInit {
  private readonly logger = new Logger(SpacesService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly cdnUrl: string;
  private readonly uploadTimeoutMs: number;
  private readonly startupStrict: boolean;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.normalizeUrl(this.getEnvOrThrow('SPACES_ENDPOINT'));
    const signingRegion = this.getEnvOrThrow('SPACES_REGION');
    const accessKeyId = this.getEnvOrThrow('SPACES_KEY');
    const secretAccessKey = this.getEnvOrThrow('SPACES_SECRET');
    this.bucket = this.getEnvOrThrow('SPACES_BUCKET');
    const spacesSlug = this.resolveSpacesRegionSlug(endpoint);
    this.publicBaseUrl = `https://${this.bucket}.${spacesSlug}.digitaloceanspaces.com`;
    this.cdnUrl = this.normalizeUrl(this.configService.get<string>('SPACES_CDN_URL') ?? '');
    this.uploadTimeoutMs = 10_000;
    this.startupStrict =
      (this.configService.get<string>('UPLOAD_STARTUP_STRICT') ?? 'false').toLowerCase() === 'true';

    this.logger.log(
      JSON.stringify({
        event: 'spaces_config_loaded',
        endpoint,
        signingRegion,
        spacesSlug,
        bucket: this.bucket,
        cdnUrl: this.cdnUrl || null,
        forcePathStyle: false,
        hasAccessKey: Boolean(accessKeyId),
        hasSecret: Boolean(secretAccessKey),
        timeoutMs: this.uploadTimeoutMs,
        startupStrict: this.startupStrict,
        allowedPrefixes: SPACES_OBJECT_PREFIXES,
      }),
    );

    this.client = new S3Client({
      region: signingRegion,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
  }

  async onModuleInit() {
    try {
      await this.checkBucketHealth();
      this.logger.log(
        JSON.stringify({
          event: 'spaces_startup_health_ok',
          bucket: this.bucket,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.error(
        JSON.stringify({
          event: 'spaces_startup_health_failed',
          bucket: this.bucket,
          error: message,
        }),
      );
      if (this.startupStrict) {
        throw new Error(`Spaces bucket health check failed: ${message}`);
      }
    }
  }

  /** DO datacenter slug from endpoint host (e.g. fra1), not AWS signing region. */
  private resolveSpacesRegionSlug(endpoint: string): string {
    try {
      const host = new URL(endpoint).hostname;
      const match = host.match(/^([a-z0-9-]+)\.digitaloceanspaces\.com$/i);
      if (match?.[1]) return match[1];
    } catch {
      // fall through
    }
    return this.getEnvOrThrow('SPACES_REGION');
  }

  private getEnvOrThrow(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`${key} is required`);
    }
    return value;
  }

  private normalizeUrl(value: string): string {
    const next = value.trim();
    if (!next) return '';
    if (next.startsWith('https://')) return next.replace(/\/$/, '');
    if (next.startsWith('http://')) return `https://${next.slice('http://'.length)}`.replace(/\/$/, '');
    return `https://${next}`.replace(/\/$/, '');
  }

  private async withTimeout<T>(action: Promise<T>, operation: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${this.uploadTimeoutMs}ms`)), this.uploadTimeoutMs);
    });
    return Promise.race([action, timeout]);
  }

  /**
   * Production guard: only single-object deletes with a valid key under allowed prefixes.
   * Bucket-level APIs (DeleteBucket, etc.) are intentionally never implemented in this app.
   */
  assertSafeObjectKey(key: string, operation: 'delete' | 'read' | 'write') {
    const trimmed = key.trim();
    if (!trimmed || trimmed === '*' || trimmed === '/' || trimmed.endsWith('/')) {
      throw new Error(`Refusing ${operation}: invalid object key`);
    }
    if (trimmed === this.bucket || trimmed.toLowerCase() === 'bucket') {
      throw new Error(`Refusing ${operation}: key must not equal bucket name`);
    }
    const topLevel = trimmed.split('/')[0];
    if (!SPACES_OBJECT_PREFIXES.includes(topLevel as SpacesObjectPrefix)) {
      throw new Error(
        `Refusing ${operation}: key must start with one of ${SPACES_OBJECT_PREFIXES.join(', ')}`,
      );
    }
  }

  buildPublicUrl(key: string): string {
    const baseUrl = this.cdnUrl || this.publicBaseUrl;
    return `${baseUrl}/${key}`;
  }

  getBucketName() {
    return this.bucket;
  }

  getPublicBaseUrl() {
    return this.cdnUrl || this.publicBaseUrl;
  }

  async createPresignedUpload(key: string, contentType: string, cacheControl: string) {
    this.assertSafeObjectKey(key, 'write');
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: cacheControl,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 60,
      signableHeaders: new Set(['content-type', 'cache-control']),
    });
    return {
      uploadUrl,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    };
  }

  async uploadBuffer(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
    cacheControl?: string;
  }) {
    this.assertSafeObjectKey(params.key, 'write');
    const cacheControl = params.cacheControl ?? 'public, max-age=31536000, immutable';
    this.logger.log(
      JSON.stringify({
        event: 'spaces_upload_start',
        bucket: this.bucket,
        key: params.key,
        contentType: params.contentType,
        size: params.buffer.length,
      }),
    );
    try {
      await this.withTimeout(
        this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: params.key,
            Body: params.buffer,
            ACL: 'public-read',
            ContentType: params.contentType,
            CacheControl: cacheControl,
          }),
        ),
        'Spaces upload',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.error(
        JSON.stringify({
          event: 'spaces_upload_error',
          bucket: this.bucket,
          key: params.key,
          error: message,
        }),
      );
      if (message.includes('AccessControlListNotSupported')) {
        this.logger.warn(
          JSON.stringify({
            event: 'spaces_upload_retry_without_acl',
            key: params.key,
          }),
        );
        await this.withTimeout(
          this.client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: params.key,
              Body: params.buffer,
              ContentType: params.contentType,
              CacheControl: cacheControl,
            }),
          ),
          'Spaces upload (no ACL)',
        );
      } else {
        throw error;
      }
    }
    this.logger.log(
      JSON.stringify({
        event: 'spaces_upload_success',
        key: params.key,
        url: this.buildPublicUrl(params.key),
      }),
    );
    return { key: params.key, url: this.buildPublicUrl(params.key) };
  }

  async testUploadConnectivity() {
    const key = `debug/connectivity-${Date.now()}.txt`;
    const payload = Buffer.from('spaces-debug-check');
    await this.uploadBuffer({
      key,
      buffer: payload,
      contentType: 'text/plain',
      cacheControl: 'no-cache',
    });
    return {
      success: true,
      key,
      url: this.buildPublicUrl(key),
    };
  }

  async deleteObject(key: string) {
    this.assertSafeObjectKey(key, 'delete');
    this.logger.warn(
      JSON.stringify({
        event: 'spaces_delete_object',
        bucket: this.bucket,
        key,
      }),
    );
    await this.withTimeout(
      this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      ),
      'Spaces delete',
    );
    this.logger.log(
      JSON.stringify({
        event: 'spaces_delete_object_success',
        bucket: this.bucket,
        key,
      }),
    );
  }

  async headObject(key: string) {
    this.assertSafeObjectKey(key, 'read');
    await this.withTimeout(
      this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      ),
      'Spaces headObject',
    );
  }

  async listObjects(prefix: string, continuationToken?: string) {
    const normalized = prefix.trim();
    if (!normalized || normalized === '*' || normalized === '/') {
      throw new Error('Refusing listObjects: invalid prefix');
    }
    const topLevel = normalized.replace(/\/$/, '').split('/')[0];
    if (!SPACES_OBJECT_PREFIXES.includes(topLevel as SpacesObjectPrefix)) {
      throw new Error(`Refusing listObjects: prefix must start with ${SPACES_OBJECT_PREFIXES.join(', ')}`);
    }
    return this.withTimeout(
      this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: normalized,
          ContinuationToken: continuationToken,
        }),
      ),
      'Spaces listObjects',
    );
  }

  async checkBucketHealth() {
    await this.withTimeout(
      this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      ),
      'Spaces headBucket',
    );
    await this.withTimeout(
      this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        }),
      ),
      'Spaces health list',
    );
    return {
      ok: true,
      bucket: this.bucket,
      publicBaseUrl: this.getPublicBaseUrl(),
    };
  }
}
