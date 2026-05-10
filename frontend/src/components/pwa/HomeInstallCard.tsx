"use client";

import { motion } from "framer-motion";
import { Download, Smartphone } from "lucide-react";
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

  const androidWaiting = showAndroid && !deferredPrompt;

  return (
    <motion.section
      className="relative mt-4 overflow-hidden rounded-3xl border border-emerald-100/90 bg-white p-4 shadow-[0_12px_40px_rgba(22,194,91,0.12),0_0_0_1px_rgba(22,194,91,0.06)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#16C25B]/15 blur-2xl"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex gap-3">
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16C25B] to-[#0FA34B] text-white shadow-[0_8px_20px_rgba(22,194,91,0.35)]"
          animate={{ boxShadow: ["0 8px 20px rgba(22,194,91,0.25)", "0 10px 28px rgba(22,194,91,0.45)", "0 8px 20px rgba(22,194,91,0.25)"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {showIos ? <Smartphone className="h-6 w-6" strokeWidth={2} /> : <Download className="h-6 w-6" strokeWidth={2} />}
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight text-[#0f172a]">Ilovani o‘rnating</h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">
            BazarBox ilovasini telefoningizga o‘rnating va tezkor foydalaning
          </p>
          {androidWaiting ? (
            <p className="mt-1 text-xs text-amber-700">Chrome o‘rnatishni tayyorlayapti — bir oz kutib, yana urinib ko‘ring.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={showAndroid && androidWaiting}
              onClick={() => void onInstall()}
              className="min-h-10 rounded-2xl bg-[#16C25B] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(22,194,91,0.35)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              O‘rnatish
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                recordEngagement();
                dismissHomeInstallForSession();
              }}
              className="min-h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Keyinroq
            </motion.button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
