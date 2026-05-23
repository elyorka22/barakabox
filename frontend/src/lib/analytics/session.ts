import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'barakabox_analytics_session';
const SESSION_STARTED_KEY = 'barakabox_analytics_session_started';

export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = uuidv4();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function markSessionStarted(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.sessionStorage.getItem(SESSION_STARTED_KEY)) return false;
  window.sessionStorage.setItem(SESSION_STARTED_KEY, '1');
  return true;
}
