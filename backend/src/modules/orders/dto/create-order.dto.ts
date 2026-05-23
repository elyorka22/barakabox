import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  manualAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formattedAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  addressLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cashbackRedeemTiyin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;

  @IsOptional()
  @IsIn(['INSTANT', 'SCHEDULED'])
  deliveryType?: 'INSTANT' | 'SCHEDULED';

  /** ISO-8601 delivery moment in Asia/Tashkent wall time (required when deliveryType=SCHEDULED). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  scheduledAt?: string;

  /** @deprecated Legacy slot key — prefer scheduledAt */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deliverySlot?: string;

  /** Marketplace store when cart was store-scoped (Stage 13). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  storeId?: string;
}
