/** Lowercase URL slug from display name. */
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function withUniqueSlugSuffix(base: string, suffix: string): string {
  const trimmed = base.slice(0, 72);
  return `${trimmed}-${suffix}`;
}
