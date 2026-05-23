import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { Role, User } from '@prisma/client';
import { PRISMA_STAFF_ROLES } from '../../common/roles';

const STAFF_EMAIL_DOMAIN = 'staff.barakabox.local';

export function staffEmailFromLogin(login: string): string {
  const normalized = login.trim().toLowerCase();
  return `${normalized}@${STAFF_EMAIL_DOMAIN}`;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findByStaffLogin(login: string): Promise<User | null> {
    const key = login.trim().toLowerCase();
    if (!key) return Promise.resolve(null);
    return this.prisma.user.findUnique({ where: { staffLogin: key } });
  }

  async findByStaffLoginOrEmail(identifier: string): Promise<User | null> {
    const raw = identifier.trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const byLogin = await this.findByStaffLogin(lower);
    if (byLogin) return byLogin;
    return this.findByEmail(lower.includes('@') ? lower : staffEmailFromLogin(lower));
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Staff accounts must not share the same phone number. */
  async assertStaffPhoneAvailable(phone: string | null | undefined, excludeUserId?: string): Promise<void> {
    const normalized = phone?.trim() || '';
    if (!normalized) return;
    const staffRoles = PRISMA_STAFF_ROLES;
    const found = await this.prisma.user.findFirst({
      where: {
        phone: normalized,
        role: { in: staffRoles },
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    if (found) {
      throw new ConflictException('Bu telefon raqami boshqa xodimda band');
    }
  }

  createUser(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role?: Role;
    staffLogin?: string | null;
    phone?: string | null;
    businessScopeId?: string | null;
    isActive?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        fullName: data.fullName.trim(),
        passwordHash: data.passwordHash,
        role: data.role ?? Role.CLIENT,
        staffLogin: data.staffLogin?.trim().toLowerCase() ?? null,
        phone: data.phone?.trim() || null,
        businessScopeId: data.businessScopeId ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async ensureGuestUser(guestId: string): Promise<User> {
    const normalizedGuestId = guestId.trim().toLowerCase();
    const cacheKey = cacheKeys.guestUserId(normalizedGuestId);
    const cachedId = await this.cache.get<string>(cacheKey);
    if (cachedId) {
      const existing = await this.prisma.user.findUnique({ where: { id: cachedId } });
      if (existing) return existing;
    }

    const email = `guest-${normalizedGuestId}@barakabox.local`;
    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: `Guest ${normalizedGuestId.slice(0, 8)}`,
        passwordHash: 'guest-account',
        role: Role.CLIENT,
        isActive: true,
      },
      update: {},
    });
    await this.cache.set(cacheKey, user.id, CACHE_TTL.guestUser);
    return user;
  }

  async listEmployeesForAdmin(opts?: {
    page?: number;
    limit?: number;
    q?: string;
    role?: Role;
    status?: 'active' | 'inactive' | 'all';
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 25));
    const skip = (page - 1) * limit;
    const search = opts?.q?.trim();
    const where: import('@prisma/client').Prisma.UserWhereInput = {
      role: opts?.role ?? { in: PRISMA_STAFF_ROLES },
    };

    if (opts?.status === 'active') where.isActive = true;
    else if (opts?.status === 'inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { staffLogin: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          email: true,
          staffLogin: true,
          phone: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          businessScopeId: true,
          createdAt: true,
          businessScope: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listStaffForAdmin(params: { role?: Role; search?: string; includeClients?: boolean }) {
    const search = params.search?.trim().toLowerCase();
    const roleFilter = params.role;
    const where: import('@prisma/client').Prisma.UserWhereInput = {};

    if (roleFilter) {
      where.role = roleFilter;
    } else if (!params.includeClients) {
      where.role = { in: PRISMA_STAFF_ROLES };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { staffLogin: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        staffLogin: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        businessScopeId: true,
        createdAt: true,
        businessProfile: { select: { id: true, displayName: true } },
        businessScope: { select: { id: true, displayName: true } },
      },
    });
  }

  async updateStaffProfile(
    id: string,
    data: {
      fullName?: string;
      phone?: string | null;
      role?: Role;
      businessScopeId?: string | null;
      staffLogin?: string | null;
    },
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const nextLogin = data.staffLogin !== undefined ? data.staffLogin?.trim().toLowerCase() || null : undefined;
    let emailUpdate: string | undefined;
    if (nextLogin !== undefined && nextLogin && nextLogin !== existing.staffLogin) {
      emailUpdate = staffEmailFromLogin(nextLogin);
      const clash = await this.prisma.user.findFirst({
        where: { email: emailUpdate, NOT: { id } },
      });
      if (clash) throw new ConflictException('Bu login uchun email band');
    }

    if (data.phone !== undefined) {
      await this.assertStaffPhoneAvailable(data.phone, id);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.businessScopeId !== undefined ? { businessScopeId: data.businessScopeId } : {}),
        ...(nextLogin !== undefined ? { staffLogin: nextLogin } : {}),
        ...(emailUpdate ? { email: emailUpdate } : {}),
      },
    });
  }

  async setStaffActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        refreshToken: isActive ? user.refreshToken : null,
      },
    });
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, refreshToken: null },
    });
  }

  async removeStaffUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.CLIENT) {
      throw new ConflictException('Mijoz akkauntini staff panelidan o‘chirib bo‘lmaydi');
    }
    await this.setStaffActive(id, false);
  }
}