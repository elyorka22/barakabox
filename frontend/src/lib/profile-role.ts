import { staffDashboardPath } from '@onlinebozor/roles';

export type ProfileRole =
  | 'client'
  | 'business'
  | 'admin'
  | 'manager'
  | 'super_admin'
  | 'courier'
  | 'picker';

export function normalizeProfileRole(role?: string): ProfileRole {
  if (!role) return 'client';
  const normalized = role.toLowerCase();
  if (normalized === 'client') return 'client';
  if (normalized === 'business') return 'business';
  if (normalized === 'super_admin') return 'super_admin';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'manager') return 'manager';
  if (normalized === 'courier') return 'courier';
  if (normalized === 'picker') return 'picker';
  return 'client';
}

/** Where to send user after password login (staff vs customer). */
export { staffDashboardPath };
