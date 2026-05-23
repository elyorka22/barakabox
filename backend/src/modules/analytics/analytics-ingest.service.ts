import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AnalyticsEventDto } from './dto/ingest-events.dto';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'phone',
  'email',
  'address',
  'card',
  'cvv',
]);

@Injectable()
export class AnalyticsIngestService {
  private readonly logger = new Logger(AnalyticsIngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  sanitizeProperties(input: Record<string, unknown> | undefined): Prisma.InputJsonValue {
    if (!input || typeof input !== 'object') return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes('secret')) continue;
      if (typeof value === 'string' && value.length > 500) {
        out[key] = `${value.slice(0, 500)}…`;
        continue;
      }
      out[key] = value;
    }
    return out as Prisma.InputJsonValue;
  }

  ingestBatch(input: {
    sessionId: string;
    guestId?: string;
    userId?: string;
    events: AnalyticsEventDto[];
  }): void {
    if (!input.events.length) return;
    void this.persistBatch(input).catch((err) => {
      this.logger.warn(
        `analytics ingest failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    });
  }

  trackServerEvent(input: {
    name: string;
    sessionId?: string;
    userId?: string;
    guestId?: string;
    properties?: Record<string, unknown>;
  }): void {
    this.ingestBatch({
      sessionId: input.sessionId ?? `server:${input.userId ?? 'system'}`,
      userId: input.userId,
      guestId: input.guestId,
      events: [
        {
          name: input.name,
          properties: input.properties,
        },
      ],
    });
  }

  private async persistBatch(input: {
    sessionId: string;
    guestId?: string;
    userId?: string;
    events: AnalyticsEventDto[];
  }) {
    const rows = input.events.map((event) => ({
      name: event.name.slice(0, 80),
      sessionId: input.sessionId.slice(0, 64),
      userId: input.userId?.slice(0, 64) ?? null,
      guestId: input.guestId?.slice(0, 64) ?? null,
      path: event.path?.slice(0, 500) ?? null,
      properties: this.sanitizeProperties(event.properties),
      durationMs: event.durationMs ?? null,
      createdAt: event.ts ? new Date(event.ts) : undefined,
    }));

    await this.prisma.analyticsEvent.createMany({ data: rows });
  }
}
