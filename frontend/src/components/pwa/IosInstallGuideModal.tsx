"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Plus, Share2, SquarePlus, X } from "lucide-react";
import { useEffect } from "react";
import { usePWAInstall } from "./pwa-context";

const steps = [
  {
    icon: Share2,
    title: "Safari pastidagi Share tugmasini bosing",
    body: "Ekran pastidagi o‘rtadagi ulashish (kvadrat va strelka) ikonkasini bosing.",
    accent: "from-sky-400 to-blue-600",
  },
  {
    icon: SquarePlus,
    title: "“Add to Home Screen” ni tanlang",
    body: "Ro‘yxatdan ushbu punktni toping va tanlang.",
    accent: "from-violet-400 to-purple-600",
  },
  {
    icon: Plus,
    title: "“Add” tugmasini bosing",
    body: "Ilova nomi va belgisini tekshirib, qo‘shishni tasdiqlang.",
    accent: "from-emerald-400 to-[#16C25B]",
  },
];

export function IosInstallGuideModal() {
  const { ready, iosModalOpen, closeIosInstallGuide, dismissIosForever, recordEngagement } = usePWAInstall();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!iosModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [iosModalOpen]);

  if (!ready) return null;

  return (
    <AnimatePresence>
      {iosModalOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeIosInstallGuide()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-sheet-title"
            className="fixed inset-x-0 bottom-0 z-[101] max-h-[min(90dvh,640px)] overflow-hidden rounded-t-[28px] border border-white/60 bg-[#f8fafc]/95 shadow-[0_-24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 280 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                closeIosInstallGuide();
              }
            }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <button
                type="button"
                className="h-1.5 w-12 cursor-grab touch-none rounded-full bg-slate-300 active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden
              />
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 pb-3 pt-1">
              <div>
                <h2 id="pwa-ios-sheet-title" className="text-lg font-bold tracking-tight text-slate-900">
                  iPhone’da ilovani o‘rnating
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Safari · Add to Home Screen</p>
              </div>
              <button
                type="button"
                onClick={() => closeIosInstallGuide()}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/60"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(62dvh,480px)] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, type: "spring", stiffness: 400, damping: 28 }}
                    className="flex gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm ring-1 ring-slate-100"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white shadow-md`}
                    >
                      <step.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Qadam {i + 1}</p>
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  recordEngagement();
                  closeIosInstallGuide();
                }}
                className="mt-5 h-12 w-full rounded-2xl bg-[#16C25B] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,194,91,0.28)]"
              >
                Tushunarli
              </motion.button>
              <button
                type="button"
                onClick={() => dismissIosForever()}
                className="mt-2 w-full py-2 text-center text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2"
              >
                Bu qo‘llanmani boshqa ko‘rsatilmasin
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
