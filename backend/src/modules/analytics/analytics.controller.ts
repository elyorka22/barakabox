import { Body, Controller, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsIngestService } from './analytics-ingest.service';
import { AnalyticsRealtimeService } from './analytics-realtime.service';
import {
  AnalyticsHeartbeatDto,
  IngestAnalyticsDto,
} from './dto/ingest-events.dto';

@SkipThrottle()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly ingest: AnalyticsIngestService,
    private readonly realtime: AnalyticsRealtimeService,
  ) {}

  @Post('events')
  ingestEvents(@Body() body: IngestAnalyticsDto) {
    this.ingest.ingestBatch({
      sessionId: body.sessionId,
      guestId: body.guestId,
      userId: body.userId,
      events: body.events,
    });
    return { ok: true };
  }

  @Post('heartbeat')
  async heartbeat(@Body() body: AnalyticsHeartbeatDto) {
    await this.realtime.heartbeat(body.sessionId, body.userId, body.guestId);
    if (body.path) {
      this.ingest.ingestBatch({
        sessionId: body.sessionId,
        guestId: body.guestId,
        userId: body.userId,
        events: [{ name: 'presence_ping', path: body.path }],
      });
    }
    return { ok: true };
  }
}
