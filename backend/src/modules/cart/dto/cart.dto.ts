import { IsInt, IsNotEmpty, IsString, Min, NotEquals } from 'class-validator';
import { IsOptional } from 'class-validator';

export class AddCartItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
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
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}

export class RemoveCartBoxDto {
  @IsString()
  @IsNotEmpty()
  boxId!: string;
}
