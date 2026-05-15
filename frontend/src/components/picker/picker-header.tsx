'use client';

import Link from 'next/link';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';

type Props = {
  online: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
};

export function PickerHeader({ online, refreshing, onRefresh, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ECECEC] bg-white/95 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ECECEC] text-[#374151] active:bg-[#F9FAFB]"
          aria-label="Bosh sahifaga"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#111827]">Picker paneli</p>
          <p className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
            <span
              className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.25)]' : 'bg-[#9CA3AF]'}`}
            />
            {online ? 'Onlayn' : 'Oflayn'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ECECEC] disabled:opacity-50"
          aria-label="Yangilash"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
          aria-label="Chiqish"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
