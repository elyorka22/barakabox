import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { parseStaffRoleQuery } from '../../common/utils/role-parse.util';
import { AdminDashboardService, type DashboardPeriod } from './admin-dashboard.service';
import { CustomersService } from '../customers/customers.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CustomerLoyaltyTier } from '../customers/customers.utils';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
    private readonly customersService: CustomersService,
    private readonly usersService: UsersService,
  ) {}

  @Get('dashboard')
  dashboard(@Query('period') period?: string) {
    const allowed: DashboardPeriod[] = ['day', 'week', 'month', 'year'];
    const p = allowed.includes(period as DashboardPeriod) ? (period as DashboardPeriod) : 'month';
    return this.dashboardService.getDashboard(p);
  }

  @Get('employees')
  listEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const roleEnum = parseStaffRoleQuery(role);
    const statusNorm =
      status === 'active' || status === 'inactive' || status === 'all' ? status : 'all';
    return this.usersService.listEmployeesForAdmin({
      page: Number(page || 1),
      limit: Number(limit || 25),
      q,
      role: roleEnum,
      status: statusNorm,
    });
  }

  @Get('customers')
  listCustomers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('loyalty') loyalty?: string,
  ) {
    const allowedSort = [
      'totalSpent',
      'totalOrders',
      'cashbackBalance',
      'createdAt',
      'name',
      'phone',
      'lastOrderAt',
    ] as const;
    const sortKey = allowedSort.includes(sortBy as (typeof allowedSort)[number])
      ? (sortBy as (typeof allowedSort)[number])
      : 'totalSpent';
    const tiers: CustomerLoyaltyTier[] = ['NEW', 'RETURNING', 'LOYAL', 'VIP'];
    const loyaltyTier = tiers.includes(loyalty as CustomerLoyaltyTier)
      ? (loyalty as CustomerLoyaltyTier)
      : undefined;

    return this.customersService.listForAdminPaginated({
      page: Number(page || 1),
      limit: Number(limit || 25),
      q,
      sortBy: sortKey,
      sortDir: sortDir === 'asc' ? 'asc' : 'desc',
      loyalty: loyaltyTier,
    });
  }

  @Get('customer-stats')
  customerStats() {
    return this.customersService.getAdminCustomerStats();
  }

  @Get('cashback-transactions')
  listCashbackTransactions() {
    return this.customersService.listTransactionsForAdmin();
  }

  @Get('stats')
  stats() {
    return this.adminService.stats();
  }
}
