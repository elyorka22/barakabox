import { IsInt, IsNotEmpty, IsString, Min, NotEquals } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

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
  @IsString()
  @IsNotEmpty()
  productId!: string;
}

export class RemoveCartBoxDto {
  @IsString()
  @IsNotEmpty()
  boxId!: string;
}
