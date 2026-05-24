import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { isMarketplaceEnabled } from '../marketplace-enabled';

function isBlockedMarketplacePath(path: string): boolean {
  if (path.startsWith('/marketplace')) return true;
  if (path.startsWith('/stores')) return true;
  if (path.startsWith('/admin/marketplace')) return true;
  if (path.startsWith('/businesses/catalog')) return true;
  if (path.startsWith('/businesses/panel/onboarding')) return true;
  if (path.startsWith('/businesses/panel/store')) return true;
  if (path.startsWith('/businesses/panel/top')) return true;
  if (path.startsWith('/businesses/panel/analytics')) return true;
  if (path.startsWith('/businesses/panel/inventory')) return true;
  if (path.startsWith('/businesses/panel/listings')) return true;
  return false;
}

@Injectable()
export class MarketplaceGateMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (isMarketplaceEnabled()) {
      next();
      return;
    }
    const path = req.path ?? req.url?.split('?')[0] ?? '';
    if (isBlockedMarketplacePath(path)) {
      res.status(404).json({ statusCode: 404, message: 'Marketplace is not available' });
      return;
    }
    next();
  }
}
