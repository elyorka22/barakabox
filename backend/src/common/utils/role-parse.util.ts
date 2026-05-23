import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PRISMA_STAFF_ROLES } from '../roles';

const STAFF_ROLE_SET = new Set<string>(PRISMA_STAFF_ROLES.map(String));

/** Parse `?role=` for admin staff listings; rejects unknown values. */
export function parseStaffRoleQuery(value?: string): Role | undefined {
  if (!value || value.trim() === '' || value.toUpperCase() === 'ALL') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!STAFF_ROLE_SET.has(normalized)) {
    throw new BadRequestException(`Noto‘g‘ri rol filtri: ${value}`);
  }
  return normalized as Role;
}
