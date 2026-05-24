import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UsersService, staffEmailFromLogin } from '../users/users.service';
import { BusinessDashboardService } from './business-dashboard.service';
import { StoreContextService } from '../marketplace/store-context.service';
import { slugifyName, withUniqueSlugSuffix } from '../../common/utils/slug.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly dashboardService: BusinessDashboardService,
    private readonly storeContext: StoreContextService,
  ) {}

  private async uniqueStoreSlug(base: string): Promise<string> {
    const slug = slugifyName(base) || 'store';
    for (let i = 0; i < 30; i += 1) {
      const candidate = i === 0 ? slug : withUniqueSlugSuffix(slug, String(i));
      const exists = await this.prisma.store.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return withUniqueSlugSuffix(slug, Date.now().toString(36));
  }

  async registerBusiness(userId: string, displayName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'BUSINESS') {
      throw new ForbiddenException('Only business users can register');
    }

    return this.prisma.businessProfile.upsert({
      where: { userId },
      create: { userId, displayName, status: 'PENDING' },
      update: { displayName, status: 'PENDING' },
    });
  }

  listPending() {
    return this.prisma.businessProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
    });
  }

  listApproved() {
    return this.prisma.businessProfile.findMany({
      where: { status: 'APPROVED', isActive: true },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.businessProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStoreByAdmin(data: {
    name: string;
    phone: string;
    login: string;
    password: string;
    address?: string;
    description?: string;
    logoUrl?: string;
  }) {
    const login = data.login.trim().toLowerCase();
    const displayName = data.name.trim();
    const phone = data.phone.trim();

    const existingLogin = await this.usersService.findByStaffLogin(login);
    if (existingLogin) {
      throw new ConflictException('Bu login band');
    }
    await this.usersService.assertStaffPhoneAvailable(phone);

    const email = staffEmailFromLogin(login);
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Bu login band');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const slug = await this.uniqueStoreSlug(displayName);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: displayName,
          role: 'BUSINESS',
          passwordHash,
          staffLogin: login,
          phone,
          isActive: true,
        },
      });
      const profile = await tx.businessProfile.create({
        data: {
          userId: user.id,
          displayName,
          phone,
          address: data.address?.trim() || null,
          description: data.description?.trim() || null,
          logoUrl: data.logoUrl?.trim() || null,
          status: 'APPROVED',
          isActive: true,
        },
        include: { user: true },
      });
      await tx.store.create({
        data: {
          name: displayName,
          slug,
          phone,
          address: data.address?.trim() || null,
          logoUrl: data.logoUrl?.trim() || null,
          isActive: true,
          businessProfileId: profile.id,
          ownerUserId: user.id,
        },
      });
      return profile;
    });
  }

  /** @deprecated Use createStoreByAdmin */
  async createInlineByAdmin(data: { name: string; phone?: string }) {
    return this.createStoreByAdmin({
      name: data.name,
      phone: data.phone?.trim() || '900000000',
      login: `store-${Date.now()}`,
      password: 'change-me-123',
    });
  }

  createByAdmin(data: { userId: string; displayName: string; phone?: string }) {
    return this.prisma.businessProfile.create({
      data: {
        userId: data.userId,
        displayName: data.displayName,
        phone: data.phone,
        status: 'APPROVED',
        isActive: true,
      },
    });
  }

  updateByAdmin(
    id: string,
    data: {
      displayName?: string;
      phone?: string | null;
      address?: string | null;
      description?: string | null;
      logoUrl?: string | null;
      isActive?: boolean;
      status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';
    },
  ) {
    return this.prisma.businessProfile.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: { user: true },
    });
  }

  removeByAdmin(id: string) {
    return this.prisma.businessProfile.update({
      where: { id },
      data: { isActive: false, status: 'DISABLED' },
    });
  }

  async approve(businessId: string) {
    const profile = await this.prisma.businessProfile.update({
      where: { id: businessId },
      data: { status: 'APPROVED', isActive: true },
    });
    await this.storeContext.ensureStoreLinkedToBusinessProfile(profile.userId);
    return profile;
  }

  reject(businessId: string) {
    return this.prisma.businessProfile.update({
      where: { id: businessId },
      data: { status: 'REJECTED', isActive: false },
    });
  }

  getDashboard(userId: string) {
    return this.dashboardService.getDashboard(userId);
  }

  getMyProfile(userId: string) {
    return this.dashboardService.getProfile(userId);
  }

  updateMyProfile(
    userId: string,
    data: {
      displayName?: string;
      phone?: string | null;
      address?: string | null;
      description?: string | null;
      logoUrl?: string | null;
    },
  ) {
    return this.dashboardService.updateProfile(userId, data);
  }

  async getMyStats(userId: string) {
    const dash = await this.dashboardService.getDashboard(userId);
    return {
      totalProducts: dash.kpis.totalProducts,
      activeProducts: dash.kpis.activeProducts,
      totalStock: 0,
      soldUnits: 0,
      totalRevenue: dash.kpis.totalRevenue,
      completedOrders: dash.kpis.completedOrders,
      todayOrders: dash.kpis.todayOrders,
      todayRevenue: dash.kpis.todayRevenue,
      pendingOrders: dash.kpis.pendingOrders,
    };
  }
}
