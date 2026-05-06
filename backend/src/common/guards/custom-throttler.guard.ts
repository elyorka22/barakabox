import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { role?: string }; headers?: { authorization?: string } }>();
    const roleFromGuard = (req.user?.role ?? '').toUpperCase();
    if (roleFromGuard === 'ADMIN') return true;

    const authorization = req.headers?.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (token) {
      try {
        const payloadRaw = token.split('.')[1] ?? '';
        const payload = JSON.parse(Buffer.from(payloadRaw, 'base64url').toString('utf-8')) as { role?: string };
        if ((payload.role ?? '').toUpperCase() === 'ADMIN') {
          return true;
        }
      } catch {
        // Ignore invalid token and use regular throttling.
      }
    }
    return super.canActivate(context);
  }
}
