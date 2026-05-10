"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Download, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { usePWAInstall } from "./pwa-context";

export function AndroidInstallBottomSheet() {
  const {
    ready,
    androidSheetOpen,
    closeAndroidInstallSheet,
    runAndroidInstallPrompt,
    dismissAndroidForever,
    recordEngagement,
  } = usePWAInstall();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!androidSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [androidSheetOpen]);

  if (!ready) return null;

  return (
    <AnimatePresence>
      {androidSheetOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 z-[95] bg-slate-900/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeAndroidInstallSheet()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-android-sheet-title"
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[min(88dvh,560px)] overflow-hidden rounded-t-[28px] border border-white/50 bg-white/80 shadow-[0_-20px_60px_rgba(15,23,42,0.22)] backdrop-blur-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 320 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) {
                closeAndroidInstallSheet();
              }
            }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <button
                type="button"
                className="h-1.5 w-12 cursor-grab touch-none rounded-full bg-slate-300 active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              />
            </div>
            <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16C25B] to-[#0FA34B] text-white shadow-lg">
                  <Sparkles className="h-7 w-7" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 id="pwa-android-sheet-title" className="text-lg font-bold text-[#0f172a]">
                    Chust Online Bozor
                  </h2>
                  <p className="text-xs text-slate-600">Rasmiy ilova sifatida o‘rnating</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3 rounded-2xl bg-white/60 px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    1
                  </span>
                  <span className="leading-snug">
                    <strong className="text-slate-900">Tezkor ishga tushish</strong> — asosiy ekrandan bir bosishda.
                  </span>
                </li>
                <li className="flex gap-3 rounded-2xl bg-white/60 px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    2
                  </span>
                  <span className="leading-snug">
                    <strong className="text-slate-900">To‘liq ekran</strong> — brauzer panelisiz qulay ko‘rinish.
                  </span>
                </li>
                <li className="flex gap-3 rounded-2xl bg-white/60 px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    3
                  </span>
                  <span className="leading-snug">
                    <strong className="text-slate-900">Barqarorlik</strong> — tarmoq uzilganda asosiy sahifalar saqlanadi.
                  </span>
                </li>
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    recordEngagement();
                    void runAndroidInstallPrompt();
                  }}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#16C25B] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,194,91,0.35)]"
                >
                  <Download className="h-5 w-5" />
                  Hozir o‘rnatish
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    recordEngagement();
                    closeAndroidInstallSheet();
                  }}
                  className="h-11 rounded-2xl text-sm font-medium text-slate-600"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => dismissAndroidForever()}
                  className="pb-1 text-center text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2"
                >
                  Hech qachon taklif qilinmasin
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
