"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emitPwaAnalytics } from "@/lib/pwa/analytics";
import { isStandaloneDisplay } from "@/lib/pwa/device";
import {
  incrementEngagementCount,
  isHomeInstallDismissedThisSession,
  resetAllInstallHints,
  setHomeInstallDismissedThisSession,
  setIosLastShownAt,
  setIosNever,
} from "@/lib/pwa/storage";
import { PwaInstallContextProvider, type PwaInstallContextValue } from "./pwa-context";
import { IosInstallGuideModal } from "./IosInstallGuideModal";
import { PwaUpdateBar } from "./PwaUpdateBar";

function useServiceWorkerUpdate() {
  const [swUpdateWaiting, setSwUpdateWaiting] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const expectReloadRef = useRef(false);

  const applyWaitingServiceWorker = useCallback(() => {
    const reg = regRef.current;
    if (!reg?.waiting) return;
    expectReloadRef.current = true;
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    emitPwaAnalytics({ name: "pwa_update_applied", props: {} });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const onControllerChange = () => {
      if (!expectReloadRef.current) return;
      expectReloadRef.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const attach = (reg: ServiceWorkerRegistration) => {
      regRef.current = reg;
      setSwUpdateWaiting(Boolean(reg.waiting));
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setSwUpdateWaiting(true);
            emitPwaAnalytics({ name: "pwa_update_waiting", props: {} });
          }
        });
      });
    };

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (cancelled || !reg) return;
      attach(reg);
    });

    const interval = window.setInterval(() => {
      void navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return { swUpdateWaiting, applyWaitingServiceWorker };
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [homeInstallSessionDismissed, setHomeInstallSessionDismissed] = useState(false);

  const { swUpdateWaiting, applyWaitingServiceWorker } = useServiceWorkerUpdate();

  const recordEngagement = useCallback(() => {
    const count = incrementEngagementCount();
    emitPwaAnalytics({ name: "pwa_engagement", props: { count } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsStandalone(isStandaloneDisplay());
      setHomeInstallSessionDismissed(isHomeInstallDismissedThisSession());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || isStandalone) return;

    const onBip = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      emitPwaAnalytics({ name: "pwa_deferred_prompt_ready", props: {} });
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIosModalOpen(false);
      emitPwaAnalytics({ name: "pwa_app_installed", props: {} });
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [ready, isStandalone]);

  const dismissHomeInstallForSession = useCallback(() => {
    setHomeInstallDismissedThisSession();
    setHomeInstallSessionDismissed(true);
    emitPwaAnalytics({ name: "pwa_home_install_session_dismiss", props: {} });
  }, []);

  const dismissIosForever = useCallback(() => {
    setIosModalOpen(false);
    setIosNever();
    emitPwaAnalytics({ name: "pwa_ios_never", props: {} });
  }, []);

  const resetInstallHints = useCallback(() => {
    resetAllInstallHints();
    setHomeInstallSessionDismissed(false);
    setIosModalOpen(false);
    emitPwaAnalytics({ name: "pwa_install_hints_reset", props: {} });
  }, []);

  const runAndroidInstallPrompt = useCallback(async (): Promise<{
    outcome: "accepted" | "dismissed" | "unavailable";
  }> => {
    if (!deferredPrompt) {
      emitPwaAnalytics({ name: "pwa_install_unavailable", props: { reason: "no_prompt" } });
      return { outcome: "unavailable" };
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      emitPwaAnalytics({
        name: "pwa_install_prompt_result",
        props: { outcome: choice.outcome },
      });
      return { outcome: choice.outcome === "accepted" ? "accepted" : "dismissed" };
    } catch {
      return { outcome: "unavailable" };
    }
  }, [deferredPrompt]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      ready,
      isStandalone,
      deferredPrompt,
      iosModalOpen,
      homeInstallSessionDismissed,
      recordEngagement,
      openIosInstallGuide: () => {
        setIosModalOpen(true);
        setIosLastShownAt(Date.now());
        emitPwaAnalytics({ name: "pwa_ios_manual_open", props: {} });
      },
      closeIosInstallGuide: () => setIosModalOpen(false),
      runAndroidInstallPrompt,
      dismissHomeInstallForSession,
      dismissIosForever,
      resetInstallHints,
      applyWaitingServiceWorker,
      updateWaiting: swUpdateWaiting,
    }),
    [
      ready,
      isStandalone,
      deferredPrompt,
      iosModalOpen,
      homeInstallSessionDismissed,
      recordEngagement,
      runAndroidInstallPrompt,
      dismissHomeInstallForSession,
      dismissIosForever,
      resetInstallHints,
      applyWaitingServiceWorker,
      swUpdateWaiting,
    ],
  );

  return (
    <PwaInstallContextProvider value={value}>
      {children}
      <PwaUpdateBar visible={swUpdateWaiting} onReload={applyWaitingServiceWorker} />
      <IosInstallGuideModal />
    </PwaInstallContextProvider>
  );
}
