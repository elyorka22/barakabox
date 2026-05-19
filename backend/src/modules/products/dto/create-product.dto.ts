import { ProductUnit, CashbackType, SellingMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

const SELLING_MODE_INPUT_MAP: Record<string, SellingMode> = {
  piece: 'PIECE',
  PIECE: 'PIECE',
  gram_step: 'GRAM_STEP',
  GRAM_STEP: 'GRAM_STEP',
  kilogram_step: 'KILOGRAM_STEP',
  KILOGRAM_STEP: 'KILOGRAM_STEP',
};

function normalizeSellingModeInput(value: unknown): SellingMode | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  return SELLING_MODE_INPUT_MAP[value.trim()] ?? undefined;
}

class ProductVariantDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  flavor?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  discountPrice?: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  price!: number; // price in tiyin

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @Transform(({ value }) => (value === 'piece' ? 'dona' : value))
  @IsEnum(ProductUnit, { message: 'Noto‘g‘ri o‘lchov birligi' })
  unit!: ProductUnit;

  @IsOptional()
  @Transform(({ value }) => normalizeSellingModeInput(value))
  @IsEnum(SellingMode, { message: 'Noto‘g‘ri sotuv rejimi' })
  sellingMode?: SellingMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  stepAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumAmount?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsOptional()
  @IsString()
  imageCardUrl?: string;

  @IsOptional()
  @IsString()
  imageCardKey?: string;

  @IsOptional()
  @IsString()
  imageThumbUrl?: string;

  @IsOptional()
  @IsString()
  imageThumbKey?: string;

  @IsOptional()
  @IsEnum(CashbackType)
  cashbackType?: CashbackType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cashbackValue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
