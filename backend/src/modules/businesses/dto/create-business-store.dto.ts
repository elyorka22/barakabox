import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBusinessStoreDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(9)
  phone!: string;

  @IsString()
  @MinLength(3)
  login!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
