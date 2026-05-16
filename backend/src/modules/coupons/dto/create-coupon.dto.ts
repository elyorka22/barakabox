import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code!: string;

  @IsIn(['PERCENT', 'FIXED_AMOUNT'])
  discountType!: 'PERCENT' | 'FIXED_AMOUNT';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED_AMOUNT'])
  discountType?: 'PERCENT' | 'FIXED_AMOUNT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class ValidateCouponDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotalAmount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee!: number;
}
