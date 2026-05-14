/**
 * Customer-facing site root for admin "back to website" links.
 * Set NEXT_PUBLIC_PUBLIC_SITE_URL when admin and storefront differ.
 */
export function getPublicSiteHref(): string {
  const base = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.trim();
  if (base) return base.replace(/\/$/, '') || '/';
  return '/';
}

/** Absolute URL for opening the storefront in a new tab (client-only). */
export function getAbsoluteSiteUrlForNewTab(): string {
  if (typeof window === 'undefined') return '/';
  const href = getPublicSiteHref();
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return `${window.location.origin}/`;
  }
}
