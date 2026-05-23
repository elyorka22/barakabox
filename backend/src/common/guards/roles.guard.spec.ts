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

  it('allows SUPER_ADMIN for ADMIN routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext('SUPER_ADMIN'))).toBe(true);
  });

  it('allows ADMIN for ADMIN routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext('ADMIN'))).toBe(true);
  });

  it('allows MANAGER for ADMIN routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext('MANAGER'))).toBe(true);
  });

  it('blocks MANAGER for SYSTEM_ADMIN routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['SYSTEM_ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext('MANAGER'))).toThrow(ForbiddenException);
  });

  it('allows STORE_OWNER for BUSINESS routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['BUSINESS']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext('STORE_OWNER'))).toBe(true);
  });
});
