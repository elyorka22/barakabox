import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (role?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as never;

  it('allows matching role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['PICKER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext('PICKER'))).toBe(true);
  });

  it('blocks non matching role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['COURIER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext('PICKER'))).toThrow(ForbiddenException);
  });
});
