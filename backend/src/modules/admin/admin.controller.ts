import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CustomersService } from '../customers/customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly customersService: CustomersService,
  ) {}

  @Get('customers')
  listCustomers() {
    return this.customersService.listForAdmin();
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
