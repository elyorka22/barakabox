"use client";

import { motion } from "framer-motion";
import { Download, Smartphone, X } from "lucide-react";
import { isAndroid, isIOSSafari } from "@/lib/pwa/device";
import { showToast } from "@/lib/toast";
import { usePWAInstall } from "./pwa-context";

export function HomeInstallCard() {
  const {
    ready,
    isStandalone,
    deferredPrompt,
    homeInstallSessionDismissed,
    runAndroidInstallPrompt,
    openIosInstallGuide,
    dismissHomeInstallForSession,
    recordEngagement,
  } = usePWAInstall();

  void deferredPrompt;

  if (!ready || isStandalone || homeInstallSessionDismissed) {
    return null;
  }

  const showIos = isIOSSafari();
  const showAndroid = isAndroid() && !showIos;
  if (!showIos && !showAndroid) {
    return null;
  }

  const onInstall = async () => {
    recordEngagement();
    if (showIos) {
      openIosInstallGuide();
      return;
    }
    const result = await runAndroidInstallPrompt();
    if (result.outcome === "unavailable") {
      showToast({
        type: "info",
        message: "Chrome tayyor bo‘lishini kuting yoki brauzerni yangilang.",
      });
    }
  };

  const onDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    recordEngagement();
    dismissHomeInstallForSession();
  };

  return (
    <motion.div
      className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2 shadow-[0_4px_14px_rgba(17,24,39,0.06)]"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        onClick={() => void onInstall()}
        className="flex flex-1 items-center gap-3 text-left active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.28)]">
          {showIos ? (
            <Smartphone className="h-4.5 w-4.5" strokeWidth={2.2} />
          ) : (
            <Download className="h-4.5 w-4.5" strokeWidth={2.2} />
          )}
        </span>
        <span className="text-sm font-semibold text-[#0f172a]">
          Ilovani o‘rnating
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Yopish"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </motion.div>
  );
}
