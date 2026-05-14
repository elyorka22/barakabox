export type ProfileRole = 'client' | 'business' | 'admin' | 'super_admin' | 'courier' | 'picker';

export function normalizeProfileRole(role?: string): ProfileRole {
  if (!role) return 'client';
  const normalized = role.toLowerCase();
  if (normalized === 'client') return 'client';
  if (normalized === 'business') return 'business';
  if (normalized === 'super_admin') return 'super_admin';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'courier') return 'courier';
  if (normalized === 'picker') return 'picker';
  return 'client';
}

/** Where to send user after password login (staff vs customer). */
export function staffDashboardPath(role?: string): string | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === 'SUPER_ADMIN' || r === 'ADMIN') return '/admin';
  if (r === 'BUSINESS') return '/business';
  if (r === 'COURIER') return '/courier';
  if (r === 'PICKER') return '/picker';
  return null;
}
