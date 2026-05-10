"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, Share2, Smartphone, SquarePlus } from "lucide-react";
import { useEffect } from "react";
import { usePWAInstall } from "./pwa-context";

const steps = [
  {
    icon: Share2,
    title: "Ulashish tugmasini bosing",
    body: "Pastki paneldagi kvadrat va strelka belgisini toping (Safari).",
    accent: "from-sky-400/90 to-blue-500/90",
  },
  {
    icon: SquarePlus,
    title: '"Asosiy ekranga qo‘shish"',
    body: "Ro‘yxatdan ushbu bandni tanlang.",
    accent: "from-violet-400/90 to-purple-600/90",
  },
  {
    icon: Plus,
    title: '"Qo‘shish" ni tasdiqlang',
    body: "Ilova nomi va ikonka tayyor — tugmani bosing.",
    accent: "from-emerald-400/90 to-[#16C25B]",
  },
];

export function IosInstallGuideModal() {
  const {
    ready,
    iosModalOpen,
    closeIosInstallGuide,
    dismissIosForever,
    recordEngagement,
  } = usePWAInstall();

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
          <motion.div
            className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeIosInstallGuide()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-title"
            className="fixed left-3 right-3 top-[max(8vh,env(safe-area-inset-top))] z-[101] mx-auto max-h-[min(82dvh,620px)] max-w-lg overflow-hidden rounded-[28px] border border-white/35 bg-gradient-to-b from-white/75 to-white/55 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl md:left-1/2 md:w-full md:-translate-x-1/2"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="relative px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg"
                    animate={{ rotate: [0, -4, 4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Smartphone className="h-6 w-6" strokeWidth={1.8} />
                  </motion.div>
                  <div>
                    <h2 id="pwa-ios-title" className="text-lg font-bold tracking-tight text-slate-900">
                      Asosiy ekranga qo‘shing
                    </h2>
                    <p className="text-xs text-slate-600">Safari orqali bir necha soniyada tayyor.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => closeIosInstallGuide()}
                  className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-white/50"
                >
                  Yopish
                </button>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                iPhone va iPad’da ilovalar brauzer orqali o‘rnatiladi — App Store talab qilinmaydi. Quyidagi
                qadamlarni bajaring:
              </p>
              <div className="mt-5 space-y-3">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, type: "spring", stiffness: 400, damping: 28 }}
                    className="flex gap-3 rounded-2xl border border-white/50 bg-white/55 p-3 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} text-white shadow-md`}
                    >
                      <step.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Qadam {i + 1}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    recordEngagement();
                    closeIosInstallGuide();
                  }}
                  className="h-12 rounded-2xl bg-[#16C25B] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,194,91,0.3)]"
                >
                  Tushunarli
                </motion.button>
                <button
                  type="button"
                  onClick={() => dismissIosForever()}
                  className="py-2 text-center text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2"
                >
                  Bu maslahatni boshqa ko‘rsatilmasin
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
