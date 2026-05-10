"use client";

import { motion } from "framer-motion";
import { Download, RefreshCw, Smartphone } from "lucide-react";
import { isAndroid, isIOSSafari } from "@/lib/pwa/device";
import { showToast } from "@/lib/toast";
import { usePWAInstall } from "./pwa-context";

export function ProfileInstallSection() {
  const {
    ready,
    isStandalone,
    deferredPrompt,
    runAndroidInstallPrompt,
    openIosInstallGuide,
    resetInstallHints,
    recordEngagement,
  } = usePWAInstall();

  if (!ready) {
    return null;
  }

  if (isStandalone) {
    return (
      <div className="mt-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16C25B] text-white shadow-md">
            <Smartphone className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Ilovani o‘rnatish</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              Ilova o‘rnatilgan
            </span>
            <p className="mt-1 text-xs text-slate-600">Siz ilovadan asosiy ekran rejimidasiz.</p>
          </div>
        </div>
      </div>
    );
  }

  const ios = isIOSSafari();
  const android = isAndroid() && !ios;

  const onPrimaryInstall = async () => {
    recordEngagement();
    if (ios) {
      openIosInstallGuide();
      return;
    }
    const r = await runAndroidInstallPrompt();
    if (r.outcome === "unavailable") {
      showToast({ type: "info", message: "Chrome orqali oching va biroz kuting — o‘rnatish tez orada chiqadi." });
    }
  };

  return (
    <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-[#0f172a]">Ilovani o‘rnatish</p>
      <p className="mt-1 text-xs text-slate-600">
        {ios
          ? "iPhone’da Safari orqali asosiy ekranga qo‘shing."
          : android
            ? deferredPrompt
              ? "Android’da brauzer orqali rasmiy o‘rnatish oynasini oching."
              : "Chrome’da oching — o‘rnatish taklifi paydo bo‘lishi uchun."
            : "Brauzeringizda PWA qo‘llab-quvvatlanmaydi yoki allaqachon o‘rnatilgan."}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {(ios || android) && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => void onPrimaryInstall()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#16C25B] text-sm font-semibold text-white shadow-[0_6px_16px_rgba(22,194,91,0.3)]"
          >
            <Download className="h-4 w-4" />
            {ios ? "Qo‘llanmani ochish" : "O‘rnatish"}
          </motion.button>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            resetInstallHints();
            showToast({ type: "success", message: "Sozlamalar tiklandi. Bosh sahifada yana taklif ko‘rinadi." });
          }}
          className="flex min-h-10 items-center justify-center gap-2 text-xs font-semibold text-slate-500"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Qayta ko‘rsatma
        </motion.button>
      </div>
    </div>
  );
}
