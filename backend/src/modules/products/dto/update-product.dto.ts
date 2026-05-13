import { ProductUnit } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ProductVariantUpdateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
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

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number; // price in tiyin

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @Transform(({ value }) => (value === 'piece' ? 'dona' : value))
  @IsEnum(ProductUnit, { message: 'Noto‘g‘ri o‘lchov birligi' })
  unit?: ProductUnit;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantUpdateDto)
  variants?: ProductVariantUpdateDto[];
}
