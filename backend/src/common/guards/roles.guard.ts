import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string };
    const userRole = (user?.role ?? '').toUpperCase();
    const normalizedRequiredRoles = requiredRoles.map((role) => role.toUpperCase());

    if (!userRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const allowed = normalizedRequiredRoles.some((required) => this.roleMatches(userRole, required));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /** SUPER_ADMIN inherits ADMIN. ADMIN decorator matches ADMIN or SUPER_ADMIN. */
  private roleMatches(userRole: string, required: string): boolean {
    if (userRole === required) return true;
    if (required === 'ADMIN' && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) return true;
    return false;
  }
}
