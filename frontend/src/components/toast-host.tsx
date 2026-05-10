'use client';

import { useEffect, useState } from 'react';
import { TOAST_EVENT, type ToastPayload } from '@/lib/toast';

export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      setToast(detail);
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setToast(null);
      }, 3000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener(TOAST_EVENT, onToast);
    };
  }, []);

  if (!toast) return null;
  const color =
    toast.type === 'success'
      ? 'bg-emerald-600'
      : toast.type === 'error'
      ? 'bg-rose-600'
      : toast.type === 'info'
      ? 'bg-sky-700'
      : 'bg-slate-800';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-3">
      <div className={`${color} max-w-sm rounded-xl px-3 py-2 text-sm font-medium text-white shadow-lg`}>
        {toast.message}
      </div>
    </div>
  );
}
