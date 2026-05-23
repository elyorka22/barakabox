import { Role } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const TEAM_ROLES = [String(Role.PICKER), String(Role.COURIER)];

export class CreateBusinessStoreStaffDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @Matches(/^[a-z0-9_]{3,32}$/)
  staffLogin!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(TEAM_ROLES)
  role!: Role;
}

export class UpdateBusinessStoreStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
