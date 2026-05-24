import { CashbackType, ProductUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Nested variant on global product create (optional batch). */
export class CreateGlobalVariantNestedDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  /** Alias for imageUrl (admin clients). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateGlobalProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  /** Alias for imageUrl (admin clients). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGlobalVariantNestedDto)
  variants?: CreateGlobalVariantNestedDto[];
}

export class UpdateGlobalProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  image?: string | null;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateGlobalVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export function resolveGlobalImageUrl(input: {
  imageUrl?: string | null;
  image?: string | null;
}): string | null {
  const url = input.imageUrl?.trim() || input.image?.trim();
  return url || null;
}

export class CreateStoreListingDto {
  @IsString()
  globalProductId!: string;

  @IsOptional()
  @IsString()
  globalVariantId?: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  oldPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(CashbackType)
  cashbackType?: CashbackType;

  @IsOptional()
  @IsInt()
  @Min(0)
  cashbackValue?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateStoreListingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  oldPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(CashbackType)
  cashbackType?: CashbackType;

  @IsOptional()
  @IsInt()
  @Min(0)
  cashbackValue?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isTop?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  topOrder?: number;
}
