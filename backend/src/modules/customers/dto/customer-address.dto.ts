import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCustomerAddressDto {
  @IsString()
  @MinLength(12)
  @MaxLength(16)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}

export class CustomerAddressPhoneQueryDto {
  @IsString()
  @MinLength(12)
  @MaxLength(16)
  phone!: string;
}
