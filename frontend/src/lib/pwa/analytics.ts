import type { PwaAnalyticsDetail } from "./types";

const EVENT_NAME = "pwa-analytics";

export function emitPwaAnalytics(detail: PwaAnalyticsDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") {
    gtag("event", detail.name, detail.props ?? {});
  }
}

export function subscribePwaAnalytics(handler: (detail: PwaAnalyticsDetail) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<PwaAnalyticsDetail>).detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
