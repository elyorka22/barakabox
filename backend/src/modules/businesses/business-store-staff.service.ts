import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { canManageStaffUser, staffRolesAssignableBy } from '../../common/roles';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { staffEmailFromLogin, UsersService } from '../users/users.service';
import { StoreContextService } from '../marketplace/store-context.service';

@Injectable()
export class BusinessStoreStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly storeContext: StoreContextService,
  ) {}

  private async ownedStoreId(userId: string): Promise<string> {
    const store = await this.storeContext.requireOwnedStore(userId);
    return store.id;
  }

  async listForOwner(ownerUserId: string) {
    const storeId = await this.ownedStoreId(ownerUserId);
    const rows = await this.prisma.user.findMany({
      where: {
        storeScopeId: storeId,
        role: { in: [Role.PICKER, Role.COURIER] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        staffLogin: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        storeScopeId: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
    }));
  }

  async createForOwner(
    ownerUserId: string,
    ownerRole: string,
    data: {
      fullName: string;
      staffLogin: string;
      password: string;
      phone?: string;
      role: Role;
    },
  ) {
    const allowed = staffRolesAssignableBy(ownerRole).map((r) => r.toUpperCase());
    if (!allowed.includes(data.role)) {
      throw new ForbiddenException('Bu rolni tayinlash huquqingiz yo‘q');
    }
    if (data.role !== Role.PICKER && data.role !== Role.COURIER) {
      throw new ForbiddenException('Faqat yig‘uvchi yoki kuryer yaratiladi');
    }

    const storeId = await this.ownedStoreId(ownerUserId);
    const login = data.staffLogin.trim().toLowerCase();
    const email = staffEmailFromLogin(login);

    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('Bu login band');
    }
    if (await this.usersService.findByStaffLogin(login)) {
      throw new ConflictException('Bu login band');
    }
    await this.usersService.assertStaffPhoneAvailable(data.phone);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.createUser({
      email,
      fullName: data.fullName,
      passwordHash,
      role: data.role,
      staffLogin: login,
      phone: data.phone ?? null,
      storeScopeId: storeId,
      businessScopeId: null,
      isActive: true,
    });

    return {
      id: user.id,
      fullName: user.fullName,
      staffLogin: user.staffLogin,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      storeScopeId: user.storeScopeId,
    };
  }

  async updateForOwner(
    ownerUserId: string,
    ownerRole: string,
    staffId: string,
    data: { fullName?: string; phone?: string | null; isActive?: boolean },
  ) {
    const storeId = await this.ownedStoreId(ownerUserId);
    const target = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!target) throw new NotFoundException('Xodim topilmadi');
    if (target.storeScopeId !== storeId) {
      throw new ForbiddenException('Bu xodim sizning do‘koningizga tegishli emas');
    }
    if (!canManageStaffUser(ownerRole, target.role, ownerUserId, staffId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (data.phone !== undefined) {
      await this.usersService.assertStaffPhoneAvailable(data.phone, staffId);
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.isActive !== undefined
          ? { isActive: data.isActive, refreshToken: data.isActive ? target.refreshToken : null }
          : {}),
      },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      staffLogin: updated.staffLogin,
      phone: updated.phone,
      role: updated.role,
      isActive: updated.isActive,
      storeScopeId: updated.storeScopeId,
    };
  }
}
