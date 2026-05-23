'use client';

import { getAnalyticsIdentity } from '@/lib/analytics/identity';
import { hasAnalyticsConsent } from '@/lib/analytics/consent';
import { getAnalyticsSessionId, markSessionStarted } from '@/lib/analytics/session';
import type { AnalyticsEventName } from '@/lib/analytics/events';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
const FLUSH_MS = 1200;
const MAX_BATCH = 20;
const HEARTBEAT_MS = 30_000;

type QueuedEvent = {
  name: string;
  path?: string;
  properties?: Record<string, unknown>;
  durationMs?: number;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let posthogReady = false;
let posthogInitStarted = false;

type PostHogLike = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  startSessionRecording?: () => void;
};

let posthog: PostHogLike | null = null;

function canTrack(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === 'true') return false;
  return hasAnalyticsConsent();
}

async function initPostHog() {
  if (posthogInitStarted || typeof window === 'undefined') return;
  posthogInitStarted = true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;
  try {
    const mod = await import('posthog-js');
    const ph = mod.default as PostHogLike;
    ph.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      loaded: () => {
        posthogReady = true;
      },
    });
    posthog = ph;
    if (process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY !== 'false') {
      ph.startSessionRecording?.();
    }
  } catch {
    // PostHog optional — first-party ingest still works
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_MS);
}

async function flushQueue() {
  if (!queue.length) return;
  const batch = queue.splice(0, MAX_BATCH);
  const sessionId = getAnalyticsSessionId();
  if (!sessionId) return;

  const identity = getAnalyticsIdentity();
  const body = {
    sessionId,
    guestId: identity.guestId,
    userId: identity.userId,
    events: batch,
  };

  try {
    await fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    queue = [...batch, ...queue].slice(0, MAX_BATCH * 3);
  }
}

function capturePostHog(name: string, properties?: Record<string, unknown>) {
  if (!posthogReady || !posthog) return;
  try {
    posthog.capture(name, properties);
  } catch {
    // ignore
  }
}

export function identifyAnalyticsUser() {
  if (!canTrack()) return;
  void initPostHog();
  const { userId } = getAnalyticsIdentity();
  if (!userId || !posthog) return;
  try {
    posthog.identify(userId, {});
  } catch {
    // ignore
  }
}

export function resetAnalyticsUser() {
  try {
    posthog?.reset();
  } catch {
    // ignore
  }
}

export function trackAnalytics(
  name: AnalyticsEventName | string,
  properties?: Record<string, unknown>,
  options?: { path?: string; durationMs?: number },
): void {
  if (!canTrack()) return;
  void initPostHog();

  const path = options?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const payload = { ...properties, path };

  capturePostHog(name, payload);

  queue.push({
    name,
    path,
    properties,
    durationMs: options?.durationMs,
  });
  if (queue.length >= MAX_BATCH) {
    void flushQueue();
  } else {
    scheduleFlush();
  }
}

export function trackPageView(path?: string) {
  trackAnalytics(ANALYTICS_EVENTS.PAGE_VIEW, { title: typeof document !== 'undefined' ? document.title : '' }, { path });
}

export function startAnalyticsRuntime() {
  if (typeof window === 'undefined' || !canTrack()) return;
  void initPostHog();

  if (markSessionStarted()) {
    trackAnalytics(ANALYTICS_EVENTS.SESSION_START, {
      referrer: document.referrer || undefined,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  identifyAnalyticsUser();

  if (heartbeatTimer) return;
  const ping = () => {
    const sessionId = getAnalyticsSessionId();
    if (!sessionId) return;
    const identity = getAnalyticsIdentity();
    void fetch(`${API_BASE}/analytics/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guestId: identity.guestId,
        userId: identity.userId,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  };
  ping();
  heartbeatTimer = setInterval(ping, HEARTBEAT_MS);

  window.addEventListener('beforeunload', () => {
    void flushQueue();
  });
}

export function trackApiError(input: {
  path: string;
  status: number;
  method: string;
  durationMs?: number;
}) {
  trackAnalytics(ANALYTICS_EVENTS.API_ERROR, {
    path: input.path,
    status: input.status,
    method: input.method,
  }, { durationMs: input.durationMs });
}

export function trackSlowRequest(input: { path: string; durationMs: number; method: string }) {
  if (input.durationMs < 2000) return;
  trackAnalytics(ANALYTICS_EVENTS.SLOW_REQUEST, input, { durationMs: input.durationMs });
}
