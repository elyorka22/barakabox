/**
 * Staff role names (aligned with Prisma `Role` enum).
 * Keep in sync with backend/src/common/roles.ts (Docker uses backend/ context only).
 */
export const STAFF_ROLE_ORDER = [
  'ADMIN',
  'MANAGER',
  'STORE_OWNER',
  'BUSINESS',
  'PICKER',
  'COURIER',
] as const;

export const ALL_STAFF_ROLES = ['SUPER_ADMIN', ...STAFF_ROLE_ORDER] as const;

export type StaffRoleName = (typeof ALL_STAFF_ROLES)[number];

export function normalizeRole(role?: string | null): string {
  return (role ?? '').trim().toUpperCase();
}

/** Legacy business panel + new store owner panel (same routes until /store ships). */
export function isStoreOperatorRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'BUSINESS' || r === 'STORE_OWNER';
}

/** Can access /admin panel (operational + system admins). */
export function isAdminPanelRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'MANAGER';
}

/** Full system settings (not available to MANAGER). */
export function isSystemAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'SUPER_ADMIN' || r === 'ADMIN';
}

export function roleMatchesRequired(userRole: string, required: string): boolean {
  const u = normalizeRole(userRole);
  const req = normalizeRole(required);
  if (!u || !req) return false;
  if (u === req) return true;
  if (req === 'ADMIN') {
    return u === 'SUPER_ADMIN' || u === 'ADMIN' || u === 'MANAGER';
  }
  if (req === 'SYSTEM_ADMIN') {
    return u === 'SUPER_ADMIN' || u === 'ADMIN';
  }
  if (req === 'BUSINESS') {
    return isStoreOperatorRole(u);
  }
  return false;
}

/** Roles the actor may assign when creating/editing staff (ordered for UI). */
function sortStaffRoles(roles: StaffRoleName[]): StaffRoleName[] {
  const order = new Map(ALL_STAFF_ROLES.map((role, index) => [role, index]));
  return [...roles].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function staffRolesAssignableBy(actorRole?: string | null): StaffRoleName[] {
  const r = normalizeRole(actorRole);
  if (r === 'SUPER_ADMIN') return sortStaffRoles([...ALL_STAFF_ROLES]);
  if (r === 'ADMIN') {
    return sortStaffRoles(['MANAGER', 'STORE_OWNER', 'BUSINESS', 'PICKER', 'COURIER']);
  }
  if (r === 'MANAGER') {
    return sortStaffRoles(['STORE_OWNER', 'BUSINESS', 'PICKER', 'COURIER']);
  }
  if (r === 'STORE_OWNER') return sortStaffRoles(['PICKER', 'COURIER']);
  return [];
}

export function staffRolesForFilter(): StaffRoleName[] {
  return sortStaffRoles([...ALL_STAFF_ROLES]);
}

export function canManageStaffUser(
  actorRole?: string | null,
  targetRole?: string | null,
  actorId?: string | null,
  targetId?: string | null,
): boolean {
  const ar = normalizeRole(actorRole);
  const tr = normalizeRole(targetRole);
  if (tr === 'CLIENT') return true;
  if (actorId && targetId && actorId === targetId) return false;
  if (ar === 'SUPER_ADMIN') return true;
  if (ar === 'ADMIN' || ar === 'MANAGER') {
    return tr !== 'SUPER_ADMIN' && tr !== 'ADMIN';
  }
  if (ar === 'STORE_OWNER') {
    return tr === 'PICKER' || tr === 'COURIER';
  }
  return false;
}

export function staffDashboardPath(role?: string | null): string | null {
  const r = normalizeRole(role);
  if (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'MANAGER') return '/admin';
  if (isStoreOperatorRole(r)) return '/store';
  if (r === 'COURIER') return '/courier';
  if (r === 'PICKER') return '/picker';
  return null;
}

/** Picker must be tied to a store (new accounts). */
export function staffRoleRequiresStoreScope(role?: string | null): boolean {
  return normalizeRole(role) === 'PICKER';
}
