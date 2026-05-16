'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Download, Smartphone, Wifi, Zap } from 'lucide-react';
import { emitPwaAnalytics } from '@/lib/pwa/analytics';
import { isIOSDevice } from '@/lib/pwa/device';
import { dismissCustomInstallModalForDays } from '@/lib/pwa/storage';
import { showToast } from '@/lib/toast';
import { usePWAInstall } from './pwa-context';

const FEATURES = [
  { icon: Zap, label: 'Tez ishlaydi' },
  { icon: Wifi, label: 'Offline ishlaydi' },
  { icon: Bell, label: 'Push bildirishnomalar' },
  { icon: Smartphone, label: 'Telefon ekranida ikonka' },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PwaInstallModal({ open, onClose }: Props) {
  const { runAndroidInstallPrompt, openIosInstallGuide } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLater = () => {
    dismissCustomInstallModalForDays(3);
    emitPwaAnalytics({ name: 'pwa_install_modal_later', props: {} });
    onClose();
  };

  const handleInstall = async () => {
    setInstalling(true);
    emitPwaAnalytics({ name: 'pwa_install_modal_install_click', props: {} });
    try {
      if (isIOSDevice()) {
        openIosInstallGuide();
        onClose();
        return;
      }
      const result = await runAndroidInstallPrompt();
      if (result.outcome === 'accepted') {
        showToast({ type: 'success', message: 'Ilova muvaffaqiyatli o‘rnatildi' });
        onClose();
      } else if (result.outcome === 'dismissed') {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Yopish"
            onClick={handleLater}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="bg-gradient-to-br from-[#16A34A] to-[#15803D] px-5 pb-8 pt-5 text-white">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Download className="h-6 w-6" strokeWidth={2.2} aria-hidden />
              </span>
              <h2 id="pwa-install-title" className="mt-4 text-xl font-bold leading-tight">
                Online Bozor ilovasini o‘rnating
              </h2>
              <p className="mt-2 text-sm leading-snug text-emerald-50/95">
                Tezkor buyurtma, push bildirishnomalar va qulay foydalanish uchun ilovani o‘rnating.
              </p>
            </div>

            <div className="px-5 py-4">
              <ul className="space-y-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-[#111827]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#16A34A]">
                      <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className="font-medium">{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={installing}
                  onClick={() => void handleInstall()}
                  className="flex min-h-12 items-center justify-center rounded-2xl bg-[#16A34A] text-[15px] font-bold text-white shadow-lg shadow-green-600/25 transition active:scale-[0.99] disabled:opacity-70"
                >
                  {installing ? 'O‘rnatilmoqda…' : 'O‘rnatish'}
                </button>
                <button
                  type="button"
                  disabled={installing}
                  onClick={handleLater}
                  className="min-h-11 rounded-2xl text-sm font-semibold text-slate-600 transition active:bg-slate-50"
                >
                  Keyinroq
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
