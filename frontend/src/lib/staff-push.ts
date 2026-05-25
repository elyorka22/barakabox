import { api, authStorage } from '@/lib/api';

const PUSH_PREF_KEY = 'bb_staff_push_enabled';

export type StaffPushSupport = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
};

export function readStaffPushPref(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PUSH_PREF_KEY) === '1';
}

export function writeStaffPushPref(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUSH_PREF_KEY, enabled ? '1' : '0');
}

export function getStaffPushSupport(): StaffPushSupport {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported' };
  }
  const supported =
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
  if (!supported) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function fetchVapidPublicKey(): Promise<{ enabled: boolean; publicKey: string | null }> {
  return api.get<{ enabled: boolean; publicKey: string | null }>('/push/vapid-public-key');
}

export async function subscribeStaffPush(): Promise<{ ok: boolean; reason?: string }> {
  const support = getStaffPushSupport();
  if (!support.supported) {
    return { ok: false, reason: 'unsupported' };
  }

  const { enabled, publicKey } = await fetchVapidPublicKey();
  if (!enabled || !publicKey) {
    return { ok: false, reason: 'server_disabled' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  const token = authStorage.getAccessToken();
  await api.post(
    '/push/subscribe',
    {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      expirationTime: json.expirationTime ?? null,
    },
    token,
  );

  writeStaffPushPref(true);
  return { ok: true };
}

export async function unsubscribeStaffPush(): Promise<void> {
  writeStaffPushPref(false);
  try {
    const token = authStorage.getAccessToken();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      if (token) {
        await api.delete<{ ok: boolean }>('/push/subscribe', endpoint ? { endpoint } : {}, token);
      }
    } else if (token) {
      await api.delete<{ ok: boolean }>('/push/subscribe', {}, token);
    }
  } catch {
    /* local opt-out still applies */
  }
}

/** Re-sync subscription after login if user previously enabled push. */
export async function ensureStaffPushSubscription(): Promise<void> {
  if (!readStaffPushPref()) return;
  const support = getStaffPushSupport();
  if (!support.supported || support.permission !== 'granted') return;
  try {
    await subscribeStaffPush();
  } catch {
    /* silent */
  }
}
