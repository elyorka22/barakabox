"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Percent, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { InstallAppButton } from "./InstallAppButton";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileMoreMenuSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-menu-title"
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[min(85dvh,520px)] overflow-y-auto rounded-t-[28px] border border-white/50 bg-white/92 shadow-[0_-16px_48px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="more-menu-title" className="text-base font-bold text-[#0f172a]">
                Menyu
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <InstallAppButton variant="menu" />
              <div className="grid gap-2">
                <Link
                  href="/categories"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f172a] transition active:bg-slate-100"
                >
                  <LayoutGrid className="h-5 w-5 text-[#16C25B]" />
                  Kategoriyalar
                </Link>
                <Link
                  href="/discounts"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f172a] transition active:bg-slate-100"
                >
                  <Percent className="h-5 w-5 text-[#8B5CF6]" />
                  Chegirmalar
                </Link>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0f172a] transition active:bg-slate-100"
                >
                  <User className="h-5 w-5 text-slate-600" />
                  Profil
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
