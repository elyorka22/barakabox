import { CashbackType, Prisma, ProductUnit } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null) return undefined;
  return value;
}

function optionalBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

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
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
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
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

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
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(64)
  categoryId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(2000)
  imageUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(2000)
  image?: string | null;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown> | null;
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
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
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

export function normalizeAttributes(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Prisma.InputJsonValue;
}

export class CreateStoreListingDto {
  @IsString()
  globalProductId!: string;

  @IsOptional()
  @IsString()
  globalVariantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  oldPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(CashbackType)
  cashbackType?: CashbackType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cashbackValue?: number;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateStoreListingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  oldPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(CashbackType)
  cashbackType?: CashbackType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cashbackValue?: number;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isTop?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  topOrder?: number;
}
