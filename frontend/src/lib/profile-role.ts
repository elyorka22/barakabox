export type ProfileRole = 'client' | 'business' | 'admin' | 'courier' | 'picker';

export function normalizeProfileRole(role?: string): ProfileRole {
  if (!role) return 'client';
  const normalized = role.toLowerCase();
  if (normalized === 'client') return 'client';
  if (normalized === 'business') return 'business';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'courier') return 'courier';
  if (normalized === 'picker') return 'picker';
  return 'client';
}
