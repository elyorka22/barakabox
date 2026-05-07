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
    const endpoint = this.getEnvOrThrow('DO_SPACES_ENDPOINT', 'SPACES_ENDPOINT');
    const region = this.getEnvOrThrow('DO_SPACES_REGION', 'SPACES_REGION');
    const accessKeyId = this.getEnvOrThrow('DO_SPACES_KEY', 'SPACES_KEY');
    const secretAccessKey = this.getEnvOrThrow('DO_SPACES_SECRET', 'SPACES_SECRET');
    this.bucket = this.getEnvOrThrow('DO_SPACES_BUCKET', 'SPACES_BUCKET');
    this.publicBaseUrl = this.getEnvOrThrow('DO_SPACES_PUBLIC_BASE_URL', 'SPACES_PUBLIC_BASE_URL').replace(/\/$/, '');
    this.cdnUrl = this.getEnv('DO_SPACES_CDN_URL', 'SPACES_CDN_URL')?.replace(/\/$/, '') ?? '';
    this.uploadTimeoutMs = Number(this.configService.get<string>('SPACES_UPLOAD_TIMEOUT_MS') ?? '10000');

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
  }

  private getEnv(primary: string, fallback: string): string | undefined {
    const a = this.configService.get<string>(primary);
    if (a && a.trim()) return a.trim();
    const b = this.configService.get<string>(fallback);
    return b?.trim();
  }

  private getEnvOrThrow(primary: string, fallback: string): string {
    const value = this.getEnv(primary, fallback);
    if (!value) {
      throw new Error(`${primary}/${fallback} is required`);
    }
    return value;
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
        key: params.key,
        contentType: params.contentType,
        size: params.buffer.length,
      }),
    );
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
    return { key: params.key, url: this.buildPublicUrl(params.key) };
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
