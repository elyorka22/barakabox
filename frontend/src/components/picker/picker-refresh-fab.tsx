'use client';

import { RefreshCw } from 'lucide-react';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
};

export function PickerRefreshFab({ refreshing, onRefresh }: Props) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-lg shadow-emerald-900/25 disabled:opacity-70 md:hidden"
      aria-label="Yangilash"
    >
      <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}
