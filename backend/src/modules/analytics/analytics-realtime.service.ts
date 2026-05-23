import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';

const ONLINE_KEY = 'analytics:online';
const ONLINE_TTL_SEC = 90;

@Injectable()
export class AnalyticsRealtimeService {
  constructor(private readonly redis: RedisService) {}

  async heartbeat(sessionId: string, userId?: string, guestId?: string): Promise<void> {
    const client = this.redis.getClient();
    if (client.status !== 'ready') return;
    const now = Date.now();
    const member = JSON.stringify({
      s: sessionId.slice(0, 64),
      u: userId?.slice(0, 64) ?? null,
      g: guestId?.slice(0, 64) ?? null,
    });
    await client
      .multi()
      .zadd(ONLINE_KEY, now, member)
      .zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_TTL_SEC * 1000)
      .expire(ONLINE_KEY, ONLINE_TTL_SEC * 2)
      .exec();
  }

  async getOnlineCount(): Promise<number> {
    const client = this.redis.getClient();
    if (client.status !== 'ready') return 0;
    const now = Date.now();
    await client.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_TTL_SEC * 1000);
    return client.zcard(ONLINE_KEY);
  }

  async getOnlineSessions(limit = 20): Promise<
    Array<{ sessionId: string; userId: string | null; guestId: string | null }>
  > {
    const client = this.redis.getClient();
    if (client.status !== 'ready') return [];
    const now = Date.now();
    await client.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_TTL_SEC * 1000);
    const raw = await client.zrevrange(ONLINE_KEY, 0, limit - 1);
    const out: Array<{ sessionId: string; userId: string | null; guestId: string | null }> = [];
    for (const row of raw) {
      try {
        const parsed = JSON.parse(row) as { s?: string; u?: string | null; g?: string | null };
        if (parsed.s) {
          out.push({
            sessionId: parsed.s,
            userId: parsed.u ?? null,
            guestId: parsed.g ?? null,
          });
        }
      } catch {
        // ignore corrupt member
      }
    }
    return out;
  }
}
