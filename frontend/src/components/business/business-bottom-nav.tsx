'use client';

import { Home, Package, ShoppingBag } from 'lucide-react';

export type BusinessTab = 'home' | 'orders' | 'products';

type Props = {
  tab: BusinessTab;
  onTabChange: (tab: BusinessTab) => void;
  pendingCount?: number;
};

export function BusinessBottomNav({ tab, onTabChange, pendingCount = 0 }: Props) {
  const items: Array<{ id: BusinessTab; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Bosh', icon: Home },
    { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag },
    { id: 'products', label: 'Mahsulotlar', icon: Package },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition ${
                active ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
              {item.id === 'orders' && pendingCount > 0 ? (
                <span className="absolute right-2 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
