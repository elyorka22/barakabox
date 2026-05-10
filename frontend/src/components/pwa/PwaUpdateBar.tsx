"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

type Props = {
  visible: boolean;
  onReload: () => void;
};

export function PwaUpdateBar({ visible, onReload }: Props) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="pointer-events-auto fixed inset-x-0 bottom-[calc(var(--bb-mobile-nav-height)+0.5rem+env(safe-area-inset-bottom))] z-[88] flex justify-center px-3 md:bottom-6"
    >
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-white/50 bg-slate-900/92 px-4 py-3 text-white shadow-[0_12px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <RefreshCw className="h-5 w-5 shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Yangi versiya tayyor</p>
          <p className="text-xs text-white/75">Yangilash uchun bosing — sahifa qayta yuklanadi.</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onReload}
          className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950"
        >
          Yangilash
        </motion.button>
      </div>
    </motion.div>
  );
}
