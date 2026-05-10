import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly cdnUrl: string;
  private readonly uploadTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.normalizeUrl(this.getEnvOrThrow('SPACES_ENDPOINT'));
    const region = this.getEnvOrThrow('SPACES_REGION');
    const accessKeyId = this.getEnvOrThrow('SPACES_KEY');
    const secretAccessKey = this.getEnvOrThrow('SPACES_SECRET');
    this.bucket = this.getEnvOrThrow('SPACES_BUCKET');
    this.publicBaseUrl = `https://${this.bucket}.${region}.digitaloceanspaces.com`;
    this.cdnUrl = this.normalizeUrl(this.configService.get<string>('SPACES_CDN_URL') ?? '');
    this.uploadTimeoutMs = 10_000;

    this.logger.log(
      JSON.stringify({
        event: 'spaces_config_loaded',
        endpoint,
        region,
        bucket: this.bucket,
        cdnUrl: this.cdnUrl || null,
        forcePathStyle: false,
        hasAccessKey: Boolean(accessKeyId),
        hasSecret: Boolean(secretAccessKey),
        timeoutMs: this.uploadTimeoutMs,
      }),
    );

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
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

  buildPublicUrl(key: string): string {
    const baseUrl = this.cdnUrl || this.publicBaseUrl;
    return `${baseUrl}/${key}`;
  }

  getBucketName() {
    return this.bucket;
  }

  async createPresignedUpload(key: string, contentType: string, cacheControl: string) {
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
    await this.withTimeout(
      this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      ),
      'Spaces delete',
    );
  }

  async headObject(key: string) {
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
    return this.withTimeout(
      this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
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
  }
}
