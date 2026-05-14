import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStaffUsersController } from './admin-staff-users.controller';
import { AdminService } from './admin.service';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CustomersModule, UsersModule],
  controllers: [AdminController, AdminStaffUsersController],
  providers: [AdminService],
})
export class AdminModule {}
