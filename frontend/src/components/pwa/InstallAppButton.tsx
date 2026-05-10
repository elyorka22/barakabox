"use client";

import { motion } from "framer-motion";
import { Download, Share2 } from "lucide-react";
import { isAndroid, isIOSSafari } from "@/lib/pwa/device";
import { usePWAInstall } from "./pwa-context";

type Variant = "hero" | "card" | "menu";

type Props = {
  variant?: Variant;
  className?: string;
};

export function InstallAppButton({ variant = "card", className = "" }: Props) {
  const {
    ready,
    isStandalone,
    deferredPrompt,
    openAndroidInstallSheet,
    openIosInstallGuide,
    recordEngagement,
  } = usePWAInstall();

  if (!ready || isStandalone) return null;

  const canAndroid = Boolean(deferredPrompt) && isAndroid();
  const canIosGuide = isIOSSafari();
  if (!canAndroid && !canIosGuide) return null;

  const onPress = () => {
    recordEngagement();
    if (canAndroid) {
      openAndroidInstallSheet();
    } else if (canIosGuide) {
      openIosInstallGuide();
    }
  };

  const Icon = canAndroid ? Download : Share2;

  if (variant === "hero") {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onPress}
        className={`inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-bold text-[#0f172a] shadow-[0_6px_20px_rgba(15,23,42,0.12)] backdrop-blur-sm ${className}`}
      >
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-4 w-4 text-[#16C25B]" strokeWidth={2.2} />
        </motion.span>
        Ilovani o‘rnatish
      </motion.button>
    );
  }

  if (variant === "menu") {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onPress}
        className={`flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#16C25B]/15 to-emerald-500/10 px-4 py-3 text-left shadow-sm ring-1 ring-emerald-500/20 ${className}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16C25B] text-white shadow-md">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#0f172a]">Ilovani o‘rnatish</span>
          <span className="block text-xs text-slate-600">Asosiy ekran va tez ishga tushirish</span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 px-4 py-3 text-left shadow-sm ${className}`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16C25B] text-white shadow-[0_6px_16px_rgba(22,194,91,0.35)]">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-sm font-bold text-[#0f172a]">Ilovani o‘rnatish</span>
          <span className="block text-xs text-slate-600">Android va iPhone uchun</span>
        </span>
      </span>
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
        PWA
      </span>
    </motion.button>
  );
}
