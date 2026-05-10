"use client";

import { createContext, useContext } from "react";

export type PwaInstallContextValue = {
  ready: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  iosModalOpen: boolean;
  homeInstallSessionDismissed: boolean;
  recordEngagement: () => void;
  openIosInstallGuide: () => void;
  closeIosInstallGuide: () => void;
  runAndroidInstallPrompt: () => Promise<{ outcome: "accepted" | "dismissed" | "unavailable" }>;
  dismissHomeInstallForSession: () => void;
  dismissIosForever: () => void;
  resetInstallHints: () => void;
  applyWaitingServiceWorker: () => void;
  updateWaiting: boolean;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallContextProvider({
  value,
  children,
}: {
  value: PwaInstallContextValue;
  children: React.ReactNode;
}) {
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePWAInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePWAInstall must be used within PWAProvider");
  }
  return ctx;
}
