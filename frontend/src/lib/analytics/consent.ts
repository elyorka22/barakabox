const CONSENT_KEY = 'barakabox_analytics_consent';

export type AnalyticsConsent = 'pending' | 'granted' | 'denied';

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'pending';
  const raw = window.localStorage.getItem(CONSENT_KEY);
  if (raw === 'granted' || raw === 'denied') return raw;
  return 'pending';
}

export function setAnalyticsConsent(value: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, value);
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}
