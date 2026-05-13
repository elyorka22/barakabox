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
      <div className="mt-4 rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] text-[#16A34A]">
            <Smartphone className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#111827]">Ilovani o‘rnatish</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#166534]">
              Ilova o‘rnatilgan
            </span>
            <p className="mt-1 text-xs text-[#6B7280]">Siz ilovadan asosiy ekran rejimidasiz.</p>
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
    <div className="mt-4 rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#111827]">Ilovani o‘rnatish</p>
      <p className="mt-1 text-xs text-[#6B7280]">
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
            className="bb-btn-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl"
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
          className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-[#6B7280]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Qayta ko‘rsatma
        </motion.button>
      </div>
    </div>
  );
}
