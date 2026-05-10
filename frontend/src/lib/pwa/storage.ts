import { PWA_STORAGE } from "./types";

function readNumber(key: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getEngagementCount(): number {
  return readNumber(PWA_STORAGE.engagementCount) ?? 0;
}

export function incrementEngagementCount(): number {
  if (typeof window === "undefined") return 0;
  const next = getEngagementCount() + 1;
  window.localStorage.setItem(PWA_STORAGE.engagementCount, String(next));
  return next;
}

export function getAndroidBannerSoftUntil(): number | null {
  return readNumber(PWA_STORAGE.androidBannerSoftUntil);
}

export function setAndroidBannerSoftUntil(timestamp: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_STORAGE.androidBannerSoftUntil, String(timestamp));
}

export function getAndroidNever(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PWA_STORAGE.androidNever) === "1";
}

export function setAndroidNever() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_STORAGE.androidNever, "1");
}

export function getIosLastShownAt(): number | null {
  return readNumber(PWA_STORAGE.iosLastShownAt);
}

export function setIosLastShownAt(timestamp: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_STORAGE.iosLastShownAt, String(timestamp));
}

export function getIosNever(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PWA_STORAGE.iosNever) === "1";
}

export function setIosNever() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_STORAGE.iosNever, "1");
}
