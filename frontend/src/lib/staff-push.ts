import { api, authStorage } from '@/lib/api';

const PUSH_PREF_KEY = 'bb_staff_push_enabled';
const LOG_PREFIX = '[staff-push]';
const SW_READY_TIMEOUT_MS = 10_000;
const PERMISSION_TIMEOUT_MS = 60_000;

/** PWA service worker (imports /push-sw-handler.js via Workbox). */
const PWA_SW_URL = '/sw.js';
/** Push handler script — used as fallback SW if /sw.js is missing. */
const PUSH_HANDLER_SW_URL = '/push-sw-handler.js';

export type StaffPushSupport = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
};

export type StaffPushEnvironment = {
  https: boolean;
  standalone: boolean;
  host: string;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  hasController: boolean;
  controllerScriptUrl: string | null;
};

export type StaffPushResult =
  | { ok: true }
  | { ok: false; reason: string; errorMessage?: string; step?: string };

export function readStaffPushPref(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PUSH_PREF_KEY) === '1';
}

export function writeStaffPushPref(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUSH_PREF_KEY, enabled ? '1' : '0');
}

function logStep(step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(LOG_PREFIX, step, detail);
  } else {
    console.log(LOG_PREFIX, step);
  }
}

function logError(step: string, error: unknown) {
  console.error(LOG_PREFIX, step, error);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} — timeout ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export function getPushEnvironment(): StaffPushEnvironment {
  if (typeof window === 'undefined') {
    return {
      https: false,
      standalone: false,
      host: '',
      hasServiceWorker: false,
      hasPushManager: false,
      hasNotification: false,
      hasController: false,
      controllerScriptUrl: null,
    };
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean(nav.standalone),
    host: window.location.host,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    hasController: Boolean(navigator.serviceWorker?.controller),
    controllerScriptUrl: navigator.serviceWorker?.controller?.scriptURL ?? null,
  };
}

export function getStaffPushSupport(): StaffPushSupport {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported' };
  }
  const env = getPushEnvironment();
  const supported = env.hasNotification && env.hasServiceWorker && env.hasPushManager && env.https;
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
  logStep('fetching vapid public key');
  const result = await api.get<{ enabled: boolean; publicKey: string | null }>('/push/vapid-public-key');
  logStep('vapid public key response', result);
  return result;
}

function waitForRegistrationActive(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) {
    logStep('service worker already active', registration.active.scriptURL);
    return Promise.resolve(registration);
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(
        new Error(
          `service worker activation timeout (${timeoutMs}ms) — state: installing=${Boolean(registration.installing)} waiting=${Boolean(registration.waiting)}`,
        ),
      );
    }, timeoutMs);

    const done = (reg: ServiceWorkerRegistration) => {
      window.clearTimeout(timer);
      resolve(reg);
    };

    const worker = registration.installing ?? registration.waiting;
    if (worker) {
      logStep('waiting for sw state change', worker.state);
      worker.addEventListener('statechange', () => {
        logStep('sw state changed', worker.state);
        if (registration.active) {
          done(registration);
        }
      });
    }

    navigator.serviceWorker.ready
      .then(() => {
        logStep('navigator.serviceWorker.ready resolved', registration.active?.scriptURL);
        if (registration.active) {
          done(registration);
        } else {
          reject(new Error('serviceWorker.ready resolved but registration has no active worker'));
        }
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  logStep('registering service worker', { pwa: PWA_SW_URL, fallback: PUSH_HANDLER_SW_URL });

  let registration: ServiceWorkerRegistration | null = null;

  try {
    logStep('attempt register PWA sw', PWA_SW_URL);
    registration = await navigator.serviceWorker.register(PWA_SW_URL, { scope: '/' });
    logStep('PWA sw register ok', registration.scope);
  } catch (pwaErr) {
    logError('PWA sw register failed', pwaErr);
    try {
      logStep('attempt register push handler sw', PUSH_HANDLER_SW_URL);
      registration = await navigator.serviceWorker.register(PUSH_HANDLER_SW_URL, { scope: '/' });
      logStep('push handler sw register ok', registration.scope);
    } catch (fallbackErr) {
      logError('push handler sw register failed', fallbackErr);
      throw fallbackErr;
    }
  }

  return waitForRegistrationActive(registration, SW_READY_TIMEOUT_MS);
}

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  logStep('resolving service worker registration');
  logStep('environment', getPushEnvironment());

  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    registration = await navigator.serviceWorker.getRegistration();
  }

  if (registration) {
    logStep('existing registration', {
      scope: registration.scope,
      active: registration.active?.scriptURL ?? null,
      installing: registration.installing?.scriptURL ?? null,
      waiting: registration.waiting?.scriptURL ?? null,
    });
    if (registration.active) {
      return registration;
    }
    return withTimeout(
      waitForRegistrationActive(registration, SW_READY_TIMEOUT_MS),
      SW_READY_TIMEOUT_MS + 500,
      'serviceWorker activation',
    );
  }

  logStep('no registration found — registering');
  return registerPushServiceWorker();
}

async function requestNotificationPermission(): Promise<NotificationPermission> {
  logStep('requesting permission');
  const result = await withTimeout(
    Notification.requestPermission(),
    PERMISSION_TIMEOUT_MS,
    'Notification.requestPermission',
  );
  logStep('permission result', result);
  return result;
}

export async function subscribeStaffPush(): Promise<StaffPushResult> {
  let step = 'init';

  try {
    step = 'environment';
    const env = getPushEnvironment();
    logStep('subscribe start', env);

    if (!env.https) {
      return {
        ok: false,
        reason: 'insecure_context',
        errorMessage: 'Push faqat HTTPS (yoki localhost) da ishlaydi',
        step,
      };
    }

    step = 'support_check';
    const support = getStaffPushSupport();
    if (!support.supported) {
      return {
        ok: false,
        reason: 'unsupported',
        errorMessage: 'Brauzer Web Push ni qo‘llab-quvvatlamaydi',
        step,
      };
    }

    step = 'vapid_fetch';
    const { enabled, publicKey } = await fetchVapidPublicKey();
    if (!enabled || !publicKey) {
      return {
        ok: false,
        reason: 'server_disabled',
        errorMessage: 'Serverda VAPID yoqilmagan',
        step,
      };
    }

    step = 'permission';
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        errorMessage: `Bildirishnoma ruxsati: ${permission}`,
        step,
      };
    }
    logStep('permission granted');

    step = 'service_worker';
    const registration = await getPushServiceWorkerRegistration();
    logStep('sw ready', registration.active?.scriptURL);

    step = 'get_subscription';
    let subscription = await registration.pushManager.getSubscription();
    logStep('existing subscription', subscription?.endpoint ?? null);

    if (!subscription) {
      step = 'push_subscribe';
      logStep('subscribing push', { userVisibleOnly: true });
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      } catch (subErr) {
        logError('pushManager.subscribe failed', subErr);
        const msg = subErr instanceof Error ? subErr.message : String(subErr);
        return {
          ok: false,
          reason: 'subscribe_failed',
          errorMessage: msg,
          step,
        };
      }
      logStep('push subscribed', subscription.endpoint);
    }

    step = 'serialize_subscription';
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return {
        ok: false,
        reason: 'invalid_subscription',
        errorMessage: 'Push obyektida endpoint yoki kalitlar yo‘q',
        step,
      };
    }

    step = 'api_subscribe';
    const token = authStorage.getAccessToken();
    if (!token) {
      return {
        ok: false,
        reason: 'not_authenticated',
        errorMessage: 'Tizimga qayta kiring (token yo‘q)',
        step,
      };
    }

    logStep('sending subscription', { endpoint: json.endpoint.slice(0, 48) + '…' });
    await api.post(
      '/push/subscribe',
      {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        expirationTime: json.expirationTime ?? null,
      },
      token,
    );
    logStep('subscription saved on server');

    writeStaffPushPref(true);
    return { ok: true };
  } catch (err) {
    logError(`failed at step: ${step}`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: 'error',
      errorMessage,
      step,
    };
  }
}

export async function unsubscribeStaffPush(): Promise<void> {
  try {
    logStep('unsubscribe start');
    writeStaffPushPref(false);
    const token = authStorage.getAccessToken();
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;

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
    logStep('unsubscribe done');
  } catch (err) {
    logError('unsubscribe error', err);
  }
}

/** Re-sync subscription after login if user previously enabled push. */
export async function ensureStaffPushSubscription(): Promise<void> {
  if (!readStaffPushPref()) return;
  const support = getStaffPushSupport();
  if (!support.supported || support.permission !== 'granted') return;
  const result = await subscribeStaffPush();
  if (!result.ok) {
    logError('ensureStaffPushSubscription failed', result);
  }
}
