import { v4 as uuidv4 } from 'uuid';
import { t } from './i18n';
import { showToast } from './toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
const REFRESH_TOKEN_KEY = 'barakabox_refresh_token';
const USER_KEY = 'barakabox_user';
const GUEST_ID_KEY = 'barakabox_guest_id';
const AUTH_CHANGED_EVENT = 'barakabox_auth_changed';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type StoredUser = { id: string; email: string; role: string; fullName: string };

let refreshInFlight: Promise<string | null> | null = null;
let accessTokenMemory = '';
let redirectingForAuth = false;

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: StoredUser;
      };
      authStorage.setAccessToken(payload.accessToken);
      authStorage.setRefreshToken(payload.refreshToken);
      authStorage.setUser(payload.user);
      notifyAuthChanged();
      return payload.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function handleSessionExpired() {
  authStorage.clearAccessToken();
  if (typeof window === 'undefined') return;
  if (redirectingForAuth) return;
  redirectingForAuth = true;
  showToast({ type: 'error', message: 'Sessiya tugadi. Iltimos qaytadan tizimga kiring.' });
  if (!window.location.pathname.startsWith('/profile')) {
    window.location.href = '/profile';
  }
  window.setTimeout(() => {
    redirectingForAuth = false;
  }, 1200);
}

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string,
  includeGuest = false,
  isRetry = false,
): Promise<T> {
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))
  ) {
    throw new Error('Production API URL localhost bo‘lishi mumkin emas');
  }

  const guestId = includeGuest ? guestStorage.getGuestId() : '';
  const effectiveToken =
    token && token.trim()
      ? token
      : typeof window !== 'undefined'
      ? authStorage.getAccessToken()
      : '';
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
        ...(guestId ? { 'x-guest-id': guestId } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`${t('common.networkError')}. ${t('common.retry')}`);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      const canTryRefresh =
        !isRetry &&
        !path.startsWith('/auth/login') &&
        !path.startsWith('/auth/register') &&
        !path.startsWith('/auth/refresh');
      if (canTryRefresh) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          return request<T>(path, method, body, refreshedToken, includeGuest, true);
        }
      }
      handleSessionExpired();
      throw new Error("Sessiya tugadi. Iltimos qaytadan tizimga kiring.");
    }
    let message = t('common.genericError');
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      message = t('common.genericError');
    }
    throw new Error(message || `${t('common.genericError')}. ${t('common.retry')}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string, includeGuest?: boolean) =>
    request<T>(path, 'GET', undefined, token, includeGuest),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, 'POST', body, token, true),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, 'PATCH', body, token),
  delete: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, 'DELETE', body, token, true),
};

export const authStorage = {
  setAccessToken(token: string) {
    accessTokenMemory = token;
    notifyAuthChanged();
  },
  getAccessToken() {
    return accessTokenMemory;
  },
  clearAccessToken() {
    accessTokenMemory = '';
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      notifyAuthChanged();
    }
  },
  setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
      notifyAuthChanged();
    }
  },
  getRefreshToken() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
  },
  setUser(user: { id: string; email: string; role: string; fullName: string }) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
      notifyAuthChanged();
    }
  },
  getUser(): { id: string; email: string; role: string; fullName: string } | null {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as { id: string; email: string; role: string; fullName: string }) : null;
  },
  async restoreSession() {
    if (accessTokenMemory) return true;
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      this.clearAccessToken();
      return false;
    }
    return true;
  },
  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // local logout still required even if API is unreachable
      }
    }
    this.clearAccessToken();
  },
};

export const authEvents = {
  changedEventName: AUTH_CHANGED_EVENT,
};

export const guestStorage = {
  getGuestId() {
    if (typeof window === 'undefined') return '';
    const existing = window.localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const created = uuidv4();
    window.localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  },
};
