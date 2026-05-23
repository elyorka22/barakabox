import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StorePanelOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;

  @IsOptional()
  @IsIn([
    'PENDING_SCHEDULE',
    'NEW',
    'PICKING',
    'READY',
    'DELIVERING',
    'DELIVERED',
    'CANCELLED',
  ])
  status?:
    | 'PENDING_SCHEDULE'
    | 'NEW'
    | 'PICKING'
    | 'READY'
    | 'DELIVERING'
    | 'DELIVERED'
    | 'CANCELLED';

  @IsOptional()
  @IsString()
  q?: string;
}
