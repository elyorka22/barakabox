export const SITE_URL = 'https://chust-online-bozor.uz';

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || SITE_URL;
}

export function getApiBaseUrl() {
  const siteUrl = getSiteUrl();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/\/$/, '');
  }
  return `${siteUrl}${apiBase.startsWith('/') ? apiBase : `/${apiBase}`}`;
}

export function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

