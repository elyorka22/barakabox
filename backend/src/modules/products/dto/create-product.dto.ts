import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
  stock!: number;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
