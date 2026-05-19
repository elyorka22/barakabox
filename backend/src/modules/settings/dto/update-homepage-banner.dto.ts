import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateHomepageBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeDeliveryAmount?: number;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
