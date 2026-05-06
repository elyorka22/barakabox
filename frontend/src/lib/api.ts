import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
const ACCESS_TOKEN_KEY = 'barakabox_access_token';
const USER_KEY = 'barakabox_user';
const GUEST_ID_KEY = 'barakabox_guest_id';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string,
  includeGuest = false,
): Promise<T> {
  const guestId = includeGuest ? guestStorage.getGuestId() : '';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(guestId ? { 'x-guest-id': guestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message || 'Request failed');
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  },
  getAccessToken() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
  },
  clearAccessToken() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  },
  setUser(user: { id: string; email: string; role: string; fullName: string }) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  getUser(): { id: string; email: string; role: string; fullName: string } | null {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as { id: string; email: string; role: string; fullName: string }) : null;
  },
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
