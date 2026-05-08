import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, NotEquals, IsOptional } from 'class-validator';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

export class AddCartItemDto {
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  productId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  variantId?: string;

  @IsInt()
  @NotEquals(0, { message: 'quantity cannot be zero' })
  quantity!: number;
}

export class AddCartBoxDto {
  @IsString()
  @IsNotEmpty()
  boxId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class RemoveCartItemDto {
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  productId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  variantId?: string;
}

export class RemoveCartBoxDto {
  @IsString()
  @IsNotEmpty()
  boxId!: string;
}
