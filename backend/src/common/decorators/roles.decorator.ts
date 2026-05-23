import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (
  ...roles: Array<
    | 'CLIENT'
    | 'BUSINESS'
    | 'STORE_OWNER'
    | 'ADMIN'
    | 'SYSTEM_ADMIN'
    | 'MANAGER'
    | 'COURIER'
    | 'PICKER'
  >
) =>
  SetMetadata(ROLES_KEY, roles);
