export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  const iosStandalone = "standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq.matches || iosStandalone;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Mobile Safari (WebKit) — Add to Home Screen flow applies. */
export function isIOSSafari(): boolean {
  if (!isIOSDevice()) return false;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isWebKit = /WebKit/.test(ua);
  const isChrome = /CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isWebKit && !isChrome;
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function supportsBeforeInstallPrompt(): boolean {
  return typeof window !== "undefined" && "onbeforeinstallprompt" in window;
}

/** Touch-first mobile viewport (install modal target). */
export function isMobileUserAgent(): boolean {
  if (typeof window === "undefined") return false;
  if (isIOSDevice() || isAndroid()) return true;
  return window.matchMedia("(max-width: 768px)").matches;
}
