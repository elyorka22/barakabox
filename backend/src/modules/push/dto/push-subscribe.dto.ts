import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

export class PushSubscribeDto {
  @IsString()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  @IsObject()
  keys!: PushKeysDto;

  @IsOptional()
  expirationTime?: number | null;
}
