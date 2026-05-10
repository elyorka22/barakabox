import { PWA_STORAGE } from "./types";

const HOME_INSTALL_SESSION_KEY = "bb_pwa_home_install_dismissed_session";

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

export function isHomeInstallDismissedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(HOME_INSTALL_SESSION_KEY) === "1";
}

export function setHomeInstallDismissedThisSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HOME_INSTALL_SESSION_KEY, "1");
}

export function clearHomeInstallSessionDismiss() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(HOME_INSTALL_SESSION_KEY);
}

/** Profil: barcha “hech qachon” va vaqtinchalik yashirishlarni tiklash. */
export function resetAllInstallHints() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PWA_STORAGE.androidNever);
  window.localStorage.removeItem(PWA_STORAGE.iosNever);
  window.localStorage.removeItem(PWA_STORAGE.androidBannerSoftUntil);
  window.localStorage.removeItem(PWA_STORAGE.iosLastShownAt);
  clearHomeInstallSessionDismiss();
}
