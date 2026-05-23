import { IsIn, IsOptional } from 'class-validator';

export type StoreAnalyticsPeriod = 'day' | 'week' | 'month';

export class StoreAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  period?: StoreAnalyticsPeriod = 'week';
}
