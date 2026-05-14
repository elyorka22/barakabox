import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsIn(['STANDARD', 'EXPRESS'])
  deliverySpeed?: 'STANDARD' | 'EXPRESS';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cashbackRedeemTiyin?: number;
}
