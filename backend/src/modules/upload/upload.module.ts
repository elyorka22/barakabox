import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadMetricsService } from './upload-metrics.service';
import { UploadHealthController } from './upload-health.controller';

@Module({
  controllers: [UploadController, UploadHealthController],
  providers: [UploadService, UploadMetricsService],
  exports: [UploadService],
})
export class UploadModule {}
