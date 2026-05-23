import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsAdminController } from './analytics-admin.controller';
import { AnalyticsIngestService } from './analytics-ingest.service';
import { AnalyticsQueryService } from './analytics-query.service';
import { AnalyticsRealtimeService } from './analytics-realtime.service';

@Module({
  controllers: [AnalyticsController, AnalyticsAdminController],
  providers: [AnalyticsIngestService, AnalyticsQueryService, AnalyticsRealtimeService],
  exports: [AnalyticsIngestService],
})
export class AnalyticsModule {}
