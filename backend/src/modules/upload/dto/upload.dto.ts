import { IsBase64, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

const MAX_BYTES = 5 * 1024 * 1024;

export class PresignUploadDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @IsBase64()
  magicBase64!: string;

  @IsNumber()
  @Min(1)
  @Max(MAX_BYTES)
  mainSize!: number;

  @IsNumber()
  @Min(1)
  @Max(MAX_BYTES)
  cardSize!: number;

  @IsNumber()
  @Min(1)
  @Max(MAX_BYTES)
  thumbSize!: number;
}

export class FinalizeUploadDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
