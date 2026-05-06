import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type Counter = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const LIMIT = 20;
const counters = new Map<string, Counter>();

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = counters.get(key);
    if (!current || current.resetAt <= now) {
      counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
      next();
      return;
    }
    if (current.count >= LIMIT) {
      throw new HttpException('Too many requests, try again later', 429);
    }
    current.count += 1;
    counters.set(key, current);
    next();
  }
}
