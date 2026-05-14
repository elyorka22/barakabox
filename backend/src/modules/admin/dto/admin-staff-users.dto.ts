import { Role } from '@prisma/client';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const CREATABLE_STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.BUSINESS, Role.COURIER, Role.PICKER];

export class AdminCreateStaffUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @Matches(/^[a-z0-9_]{3,32}$/, { message: 'Login: 3-32 ta kichik harf, raqam yoki _' })
  staffLogin!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(CREATABLE_STAFF_ROLES)
  role!: Role;

  @IsOptional()
  @IsString()
  businessScopeId?: string;
}

export class AdminUpdateStaffUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn(CREATABLE_STAFF_ROLES)
  role?: Role;

  @IsOptional()
  @IsString()
  businessScopeId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{3,32}$/)
  staffLogin?: string | null;
}

export class AdminResetStaffPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
