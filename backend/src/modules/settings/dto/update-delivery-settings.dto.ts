import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateDeliverySettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryPrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  freeDeliveryEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDeliveryThreshold?: number;
}
