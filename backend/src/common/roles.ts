import { Role } from '@prisma/client';
import {
  ALL_STAFF_ROLES,
  isAdminPanelRole,
  isSystemAdminRole,
  roleMatchesRequired,
  staffRolesAssignableBy,
  canManageStaffUser,
} from '../../../shared/roles';

export {
  ALL_STAFF_ROLES,
  isAdminPanelRole,
  isSystemAdminRole,
  roleMatchesRequired,
  staffRolesAssignableBy,
  canManageStaffUser,
};

/** Prisma staff roles (excludes CLIENT). */
export const PRISMA_STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MANAGER,
  Role.BUSINESS,
  Role.COURIER,
  Role.PICKER,
];

export function isPrismaStaffRole(role: Role): boolean {
  return PRISMA_STAFF_ROLES.includes(role);
}
