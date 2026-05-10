"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download } from "lucide-react";
import { usePWAInstall } from "./pwa-context";

export function AndroidInstallFab() {
  const { ready, showAndroidFab, openAndroidInstallSheet, recordEngagement } = usePWAInstall();

  if (!ready) return null;

  return (
    <AnimatePresence>
      {showAndroidFab ? (
        <motion.button
          type="button"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            recordEngagement();
            openAndroidInstallSheet();
          }}
          className="pointer-events-auto fixed bottom-[calc(var(--bb-mobile-nav-height)+1.25rem+env(safe-area-inset-bottom))] right-4 z-[85] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#16C25B] to-[#0FA34B] text-white shadow-[0_10px_28px_rgba(22,194,91,0.45)] md:bottom-8 md:right-8"
          aria-label="Ilovani o‘rnatish"
        >
          <motion.span
            className="absolute inset-0 rounded-full bg-white/25"
            animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <Download className="relative h-6 w-6" strokeWidth={2.2} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
