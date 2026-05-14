import { Body, Controller, Delete, ConflictException, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService, staffEmailFromLogin } from '../users/users.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  AdminCreateStaffUserDto,
  AdminResetStaffPasswordDto,
  AdminUpdateStaffUserDto,
} from './dto/admin-staff-users.dto';

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.BUSINESS, Role.COURIER, Role.PICKER];

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminStaffUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  private assertCanAssignRole(actor: AuthUser, targetRole: Role) {
    if (targetRole === Role.CLIENT) {
      throw new ForbiddenException('CLIENT staff orqali yaratilmaydi');
    }
    const r = (actor.role ?? '').toUpperCase();
    if (targetRole === Role.SUPER_ADMIN && r !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Faqat super admin boshqa super admin yaratishi mumkin');
    }
    if (!STAFF_ROLES.includes(targetRole)) {
      throw new ForbiddenException('Noto‘g‘ri rol');
    }
  }

  @Get()
  async list(
    @Query('role') role?: string,
    @Query('q') q?: string,
    @Query('includeClients') includeClients?: string,
  ) {
    const roleEnum = role && role !== 'ALL' ? (role.toUpperCase() as Role) : undefined;
    return this.usersService.listStaffForAdmin({
      role: roleEnum,
      search: q,
      includeClients: includeClients === '1' || includeClients === 'true',
    });
  }

  @Post()
  async create(@CurrentUser() actor: AuthUser, @Body() dto: AdminCreateStaffUserDto) {
    this.assertCanAssignRole(actor, dto.role);
    const login = dto.staffLogin.trim().toLowerCase();
    const email = staffEmailFromLogin(login);
    const existingEmail = await this.usersService.findByEmail(email);
    const existingLogin = await this.usersService.findByStaffLogin(login);
    if (existingEmail || existingLogin) {
      throw new ConflictException('Bu login allaqachon band');
    }
    if (dto.businessScopeId) {
      const bp = await this.prisma.businessProfile.findUnique({ where: { id: dto.businessScopeId } });
      if (!bp) throw new ForbiddenException('Biznes topilmadi');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email,
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
      staffLogin: login,
      phone: dto.phone ?? null,
      businessScopeId: dto.businessScopeId ?? null,
      isActive: true,
    });
    return this.sanitize(user);
  }

  @Patch(':id')
  async update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateStaffUserDto) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (dto.role) this.assertCanAssignRole(actor, dto.role);
    const updated = await this.usersService.updateStaffProfile(id, {
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role,
      businessScopeId: dto.businessScopeId,
      staffLogin: dto.staffLogin,
    });
    return this.sanitize(updated);
  }

  @Patch(':id/block')
  async block(@Param('id') id: string) {
    const u = await this.usersService.setStaffActive(id, false);
    return this.sanitize(u);
  }

  @Patch(':id/unblock')
  async unblock(@Param('id') id: string) {
    const u = await this.usersService.setStaffActive(id, true);
    return this.sanitize(u);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: AdminResetStaffPasswordDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const u = await this.usersService.setPasswordHash(id, hash);
    return this.sanitize(u);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.removeStaffUser(id);
    return { ok: true };
  }

  private sanitize(user: {
    id: string;
    email: string;
    staffLogin: string | null;
    phone: string | null;
    fullName: string;
    role: Role;
    isActive: boolean;
    lastLoginAt: Date | null;
    businessScopeId: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      staffLogin: user.staffLogin,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      businessScopeId: user.businessScopeId,
    };
  }
}
