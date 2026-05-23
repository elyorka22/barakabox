import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateStoreTopItemDto {
  @IsString()
  id!: string;

  @IsBoolean()
  isTop!: boolean;

  @IsInt()
  @Min(0)
  topOrder!: number;
}

export class UpdateStoreTopProductsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UpdateStoreTopItemDto)
  items!: UpdateStoreTopItemDto[];
}
