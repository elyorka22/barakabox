import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBusinessProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}

export class UpdateBusinessByAdminDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';
}
