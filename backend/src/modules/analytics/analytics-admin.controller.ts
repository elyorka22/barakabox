import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AnalyticsQueryService,
  type AnalyticsPeriod,
} from './analytics-query.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsAdminController {
  constructor(private readonly query: AnalyticsQueryService) {}

  @Get('overview')
  overview(@Query('period') period?: string) {
    const allowed: AnalyticsPeriod[] = ['day', 'week', 'month'];
    const p = allowed.includes(period as AnalyticsPeriod) ? (period as AnalyticsPeriod) : 'week';
    return this.query.getOverview(p);
  }

  @Get('realtime')
  realtime() {
    return this.query.getRealtime();
  }
}
