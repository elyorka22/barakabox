import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class UploadMetricsService {
  private readonly registry = new Registry();
  private readonly uploadCount: Counter<string>;
  private readonly uploadErrors: Counter<string>;
  private readonly uploadBytes: Counter<string>;
  private readonly retrySuccessCount: Counter<string>;
  private readonly retryFailureCount: Counter<string>;
  private uploadsCountValue = 0;
  private uploadErrorsValue = 0;
  private uploadedBytesValue = 0;
  private retrySuccessValue = 0;
  private retryFailureValue = 0;
  private readonly errorTimestamps: number[] = [];
  private readonly cleanupFailureTimestamps: number[] = [];
  private readonly alertWebhookUrl: string;
  private readonly telegramBotToken: string;
  private readonly telegramChatId: string;
  private readonly errorRateThreshold: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadCount = new Counter({
      name: 'upload_count',
      help: 'Total successful uploads',
      registers: [this.registry],
    });
    this.uploadErrors = new Counter({
      name: 'upload_errors',
      help: 'Total upload errors',
      registers: [this.registry],
    });
    this.uploadBytes = new Counter({
      name: 'upload_bytes',
      help: 'Total uploaded bytes',
      registers: [this.registry],
    });
    this.retrySuccessCount = new Counter({
      name: 'retry_success_count',
      help: 'Total successful retry operations',
      registers: [this.registry],
    });
    this.retryFailureCount = new Counter({
      name: 'retry_failure_count',
      help: 'Total failed retry operations',
      registers: [this.registry],
    });
    this.alertWebhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL') ?? '';
    this.telegramBotToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.telegramChatId = this.configService.get<string>('TELEGRAM_CHAT_ID') ?? '';
    this.errorRateThreshold = Number(this.configService.get<string>('UPLOAD_ERROR_RATE_THRESHOLD') ?? '10');
  }

  recordSuccess(sizeInBytes: number) {
    this.uploadCount.inc();
    this.uploadBytes.inc(sizeInBytes);
    this.uploadsCountValue += 1;
    this.uploadedBytesValue += sizeInBytes;
  }

  async recordError() {
    this.uploadErrors.inc();
    this.uploadErrorsValue += 1;
    this.errorTimestamps.push(Date.now());
    await this.checkHighErrorRate();
  }

  async recordCleanupFailure() {
    this.cleanupFailureTimestamps.push(Date.now());
    await this.sendAlert('cleanup_failures', 'Upload orphan cleanup failed');
  }

  recordRetrySuccess() {
    this.retrySuccessCount.inc();
    this.retrySuccessValue += 1;
  }

  recordRetryFailure() {
    this.retryFailureCount.inc();
    this.retryFailureValue += 1;
  }

  async getPrometheusMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getSnapshot() {
    const errorRatePercent =
      this.uploadsCountValue > 0
        ? Number(((this.uploadErrorsValue / this.uploadsCountValue) * 100).toFixed(2))
        : 0;
    return {
      uploadsCount: this.uploadsCountValue,
      uploadErrors: this.uploadErrorsValue,
      uploadedBytes: this.uploadedBytesValue,
      errorRatePercent,
      retrySuccessCount: this.retrySuccessValue,
      retryFailureCount: this.retryFailureValue,
    };
  }

  private async checkHighErrorRate() {
    const windowMs = 5 * 60 * 1000;
    const now = Date.now();
    while (this.errorTimestamps.length && this.errorTimestamps[0] < now - windowMs) {
      this.errorTimestamps.shift();
    }
    if (this.errorTimestamps.length >= this.errorRateThreshold) {
      await this.sendAlert(
        'high_upload_error_rate',
        `Upload error rate high: ${this.errorTimestamps.length} in last 5 minutes`,
      );
      this.errorTimestamps.length = 0;
    }
  }

  private async sendAlert(type: string, message: string) {
    try {
      if (this.alertWebhookUrl) {
        await fetch(this.alertWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, message, source: 'upload-system' }),
        });
      }
      if (this.telegramBotToken && this.telegramChatId) {
        await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.telegramChatId,
            text: `Upload alert: ${type}\n${message}`,
          }),
        });
      }
    } catch {
      // noop: avoid cascading failures
    }
  }
}
