'use client';

import { useRef, useState, type ReactNode } from 'react';

type Props = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export function CourierPullRefresh({ onRefresh, children }: Props) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 8) return;
    startY.current = e.touches[0]?.clientY ?? 0;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current) return;
    const y = e.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, Math.min(80, y - startY.current));
    setPull(delta);
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull > 56 && !refreshing) {
      setRefreshing(true);
      void onRefresh().finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(pull > 0 || refreshing) && (
        <div
          className="flex items-center justify-center text-xs font-medium text-[#16A34A] transition-[height]"
          style={{ height: refreshing ? 32 : pull / 2 }}
        >
          {refreshing ? 'Yangilanmoqda…' : pull > 56 ? 'Qo‘yib yuboring' : 'Pastga torting'}
        </div>
      )}
      {children}
    </div>
  );
}

