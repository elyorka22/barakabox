"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "./pwa-context";

export function AndroidInstallBanner() {
  const {
    ready,
    showAndroidBanner,
    openAndroidInstallSheet,
    dismissAndroidBannerSoft,
    dismissAndroidForever,
    recordEngagement,
  } = usePWAInstall();

  if (!ready) return null;

  return (
    <AnimatePresence>
      {showAndroidBanner ? (
        <motion.div
          initial={{ y: -88, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -88, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] md:left-auto md:right-6 md:max-w-md"
        >
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/75 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="flex items-start gap-3 p-3.5">
              <motion.div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16C25B] to-[#0FA34B] text-white shadow-[0_6px_16px_rgba(22,194,91,0.35)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Download className="h-5 w-5" strokeWidth={2.2} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0f172a]">Ilovani o‘rnating</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Tezroq ochish, to‘liq ekran va oflayn rejimga yaqin tajriba.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      recordEngagement();
                      openAndroidInstallSheet();
                    }}
                    className="rounded-xl bg-[#16C25B] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(22,194,91,0.35)]"
                  >
                    O‘rnatish
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      recordEngagement();
                      dismissAndroidBannerSoft();
                    }}
                    className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700"
                  >
                    Keyinroq
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => dismissAndroidForever()}
                    className="px-2 py-2 text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2"
                  >
                    Boshqa ko‘rsatilmasin
                  </button>
                </div>
              </div>
              <button
                type="button"
                aria-label="Yopish"
                onClick={() => dismissAndroidBannerSoft()}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
