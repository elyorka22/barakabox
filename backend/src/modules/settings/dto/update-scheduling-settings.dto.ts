import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSchedulingSettingsDto {
  @IsOptional()
  @IsBoolean()
  scheduledOrdersEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([30, 60])
  scheduleSlotMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  scheduleWorkStartHour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  scheduleWorkEndHour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  scheduleMinDelayMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  scheduleMaxOrdersPerSlot?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  schedulePrepLeadMinutes?: number;
}
