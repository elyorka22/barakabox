import { isSystemAdminRole } from '@onlinebozor/roles';

export {
  ALL_STAFF_ROLES,
  STAFF_ROLE_ORDER,
  type StaffRoleName,
  canManageStaffUser,
  isAdminPanelRole,
  isSystemAdminRole,
  staffRolesAssignableBy,
  staffRolesForFilter,
  staffDashboardPath,
} from '@onlinebozor/roles';

export function roleBadgeClass(role: string): string {
  const r = role.toUpperCase();
  if (r === 'SUPER_ADMIN') return 'bg-violet-100 text-violet-800';
  if (r === 'ADMIN') return 'bg-sky-100 text-sky-800';
  if (r === 'MANAGER') return 'bg-indigo-100 text-indigo-900';
  if (r === 'BUSINESS') return 'bg-amber-100 text-amber-900';
  if (r === 'COURIER') return 'bg-emerald-100 text-emerald-900';
  if (r === 'PICKER') return 'bg-orange-100 text-orange-900';
  return 'bg-slate-100 text-slate-700';
}

/** Nav + settings: hide system-only items for MANAGER. */
export function isAdminNavPathAllowed(href: string, actorRole?: string | null): boolean {
  if (href !== '/admin/settings') return true;
  return isSystemAdminRole(actorRole);
}
