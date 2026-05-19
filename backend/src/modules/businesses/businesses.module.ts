import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessDashboardService } from './business-dashboard.service';

@Module({
  imports: [UsersModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessDashboardService],
  exports: [BusinessesService, BusinessDashboardService],
})
export class BusinessesModule {}
