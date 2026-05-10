"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emitPwaAnalytics } from "@/lib/pwa/analytics";
import {
  isAndroid,
  isIOSSafari,
  isStandaloneDisplay,
  supportsBeforeInstallPrompt,
} from "@/lib/pwa/device";
import {
  getAndroidBannerSoftUntil,
  getAndroidNever,
  getEngagementCount,
  getIosLastShownAt,
  getIosNever,
  incrementEngagementCount,
  setAndroidBannerSoftUntil,
  setAndroidNever,
  setIosLastShownAt,
  setIosNever,
} from "@/lib/pwa/storage";
import {
  PWA_ANDROID_BANNER_DELAY_MS,
  PWA_ENGAGEMENT_THRESHOLD,
  PWA_IOS_COOLDOWN_MS,
} from "@/lib/pwa/types";
import { PwaInstallContextProvider, type PwaInstallContextValue } from "./pwa-context";
import { AndroidInstallBanner } from "./AndroidInstallBanner";
import { AndroidInstallBottomSheet } from "./AndroidInstallBottomSheet";
import { AndroidInstallFab } from "./AndroidInstallFab";
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
  const [androidSheetOpen, setAndroidSheetOpen] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [engagement, setEngagement] = useState(0);
  const [androidNever, setAndroidNeverState] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosAutoShownSessionRef = useRef(false);

  const { swUpdateWaiting, applyWaitingServiceWorker } = useServiceWorkerUpdate();

  const recordEngagement = useCallback(() => {
    const next = incrementEngagementCount();
    setEngagement(next);
    emitPwaAnalytics({ name: "pwa_engagement", props: { count: next } });
  }, []);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setEngagement(getEngagementCount());
    setAndroidNeverState(getAndroidNever());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || isStandalone) return;

    const onPointer = () => {
      recordEngagement();
    };
    window.addEventListener("pointerdown", onPointer, { passive: true, capture: true });
    return () => window.removeEventListener("pointerdown", onPointer, true);
  }, [ready, isStandalone, recordEngagement]);

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
      setShowAndroidBanner(false);
      setAndroidSheetOpen(false);
      emitPwaAnalytics({ name: "pwa_app_installed", props: {} });
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [ready, isStandalone]);

  useEffect(() => {
    if (!ready || isStandalone) return;
    if (androidNever) return;
    if (!deferredPrompt && !(isAndroid() && supportsBeforeInstallPrompt())) return;

    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }

    bannerTimerRef.current = setTimeout(() => {
      const softUntil = getAndroidBannerSoftUntil();
      if (softUntil && Date.now() < softUntil) {
        setShowAndroidBanner(false);
        return;
      }
      if (engagement >= PWA_ENGAGEMENT_THRESHOLD || getEngagementCount() >= PWA_ENGAGEMENT_THRESHOLD) {
        setShowAndroidBanner(true);
        emitPwaAnalytics({ name: "pwa_android_banner_shown", props: {} });
      }
    }, PWA_ANDROID_BANNER_DELAY_MS);

    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [ready, isStandalone, deferredPrompt, engagement, androidNever]);

  useEffect(() => {
    if (!ready || isStandalone) return;
    if (!isIOSSafari()) return;
    if (getIosNever()) return;

    const last = getIosLastShownAt();
    if (last && Date.now() - last < PWA_IOS_COOLDOWN_MS) return;
    if (getEngagementCount() < PWA_ENGAGEMENT_THRESHOLD && engagement < PWA_ENGAGEMENT_THRESHOLD) return;
    if (iosAutoShownSessionRef.current) return;

    const t = window.setTimeout(() => {
      if (getEngagementCount() < PWA_ENGAGEMENT_THRESHOLD) return;
      iosAutoShownSessionRef.current = true;
      setIosModalOpen(true);
      setIosLastShownAt(Date.now());
      emitPwaAnalytics({ name: "pwa_ios_guide_shown", props: { auto: true } });
    }, PWA_ANDROID_BANNER_DELAY_MS + 2000);

    return () => window.clearTimeout(t);
  }, [ready, isStandalone, engagement]);

  const dismissAndroidBannerSoft = useCallback(() => {
    setShowAndroidBanner(false);
    const day = 24 * 60 * 60 * 1000;
    setAndroidBannerSoftUntil(Date.now() + day);
    emitPwaAnalytics({ name: "pwa_android_banner_soft_dismiss", props: {} });
  }, []);

  const dismissAndroidForever = useCallback(() => {
    setShowAndroidBanner(false);
    setAndroidSheetOpen(false);
    setAndroidNever();
    setAndroidNeverState(true);
    emitPwaAnalytics({ name: "pwa_android_never", props: {} });
  }, []);

  const dismissIosForever = useCallback(() => {
    setIosModalOpen(false);
    setIosNever();
    emitPwaAnalytics({ name: "pwa_ios_never", props: {} });
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
      setAndroidSheetOpen(false);
      setShowAndroidBanner(false);
      emitPwaAnalytics({
        name: "pwa_install_prompt_result",
        props: { outcome: choice.outcome },
      });
      return { outcome: choice.outcome === "accepted" ? "accepted" : "dismissed" };
    } catch {
      return { outcome: "unavailable" };
    }
  }, [deferredPrompt]);

  const bannerVisible =
    showAndroidBanner && !isStandalone && Boolean(deferredPrompt) && !androidNever;

  const fabVisible =
    !isStandalone &&
    Boolean(deferredPrompt) &&
    isAndroid() &&
    !androidNever &&
    !bannerVisible;

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      ready,
      isStandalone,
      deferredPrompt,
      androidSheetOpen,
      iosModalOpen,
      recordEngagement,
      openAndroidInstallSheet: () => {
        setAndroidSheetOpen(true);
        emitPwaAnalytics({ name: "pwa_android_sheet_open", props: {} });
      },
      closeAndroidInstallSheet: () => setAndroidSheetOpen(false),
      openIosInstallGuide: () => {
        setIosModalOpen(true);
        setIosLastShownAt(Date.now());
        emitPwaAnalytics({ name: "pwa_ios_manual_open", props: {} });
      },
      closeIosInstallGuide: () => setIosModalOpen(false),
      runAndroidInstallPrompt,
      dismissAndroidBannerSoft,
      dismissAndroidForever,
      dismissIosForever,
      showAndroidBanner: bannerVisible,
      showAndroidFab: fabVisible,
      applyWaitingServiceWorker,
      updateWaiting: swUpdateWaiting,
    }),
    [
      ready,
      isStandalone,
      deferredPrompt,
      androidSheetOpen,
      iosModalOpen,
      recordEngagement,
      runAndroidInstallPrompt,
      dismissAndroidBannerSoft,
      dismissAndroidForever,
      dismissIosForever,
      bannerVisible,
      fabVisible,
      applyWaitingServiceWorker,
      swUpdateWaiting,
    ],
  );

  return (
    <PwaInstallContextProvider value={value}>
      {children}
      <PwaUpdateBar visible={swUpdateWaiting} onReload={applyWaitingServiceWorker} />
      <AndroidInstallBanner />
      <AndroidInstallFab />
      <AndroidInstallBottomSheet />
      <IosInstallGuideModal />
    </PwaInstallContextProvider>
  );
}
