/**
 * PWA / install prompt typings.
 *
 * `BeforeInstallPromptEvent` is supported in Chromium; it is not always present in
 * the TypeScript `lib.dom` version pinned by the project, so we augment the global
 * scope explicitly. Kept in one file to avoid duplicate `WindowEventMap` merges.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export {};
