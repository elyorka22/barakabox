import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @IsIn(['kg', 'piece', 'pack'])
  unitType?: 'kg' | 'piece' | 'pack';

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
}
