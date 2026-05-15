'use client';

import { BarChart3, ClipboardList, History, User } from 'lucide-react';
import type { CourierTab } from '@/lib/courier-types';

const TABS: { id: CourierTab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'active', label: 'Faol', icon: ClipboardList },
  { id: 'history', label: 'Tarix', icon: History },
  { id: 'stats', label: 'Statistika', icon: BarChart3 },
  { id: 'profile', label: 'Profil', icon: User },
];

type Props = {
  tab: CourierTab;
  onTab: (tab: CourierTab) => void;
  activeCount?: number;
};

export function CourierBottomNav({ tab, onTab, activeCount = 0 }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#ECECEC] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 transition active:scale-95 ${
                active ? 'text-[#16A34A]' : 'text-[#9CA3AF]'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {item.id === 'active' && activeCount > 0 ? (
                <span className="absolute right-[18%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 text-[9px] font-bold text-white">
                  {activeCount > 9 ? '9+' : activeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
