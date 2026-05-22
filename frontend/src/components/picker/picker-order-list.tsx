'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { PickerOrder } from '@/lib/picker-types';
import { PickerOrderCard } from './picker-order-card';

const VIRTUAL_THRESHOLD = 30;
const ESTIMATED_ROW_PX = 300;
const OVERSCAN = 2;

type Props = {
  orders: PickerOrder[];
  busyId: string | null;
  onStart: (orderId: string) => Promise<void>;
  onReady: (order: PickerOrder) => Promise<void>;
};

function PickerOrderListBase({ orders, busyId, onStart, onReady }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(640);

  const useVirtual = orders.length > VIRTUAL_THRESHOLD;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !useVirtual) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, [useVirtual]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  if (!useVirtual) {
    return (
      <ul className="space-y-3">
        {orders.map((order) => (
          <PickerOrderCard
            key={order.id}
            order={order}
            busy={busyId === order.id}
            onStart={() => onStart(order.id)}
            onReady={() => onReady(order)}
          />
        ))}
      </ul>
    );
  }

  const totalHeight = orders.length * ESTIMATED_ROW_PX;
  const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_PX) - OVERSCAN);
  const visibleCount = Math.ceil(viewportH / ESTIMATED_ROW_PX) + OVERSCAN * 2;
  const end = Math.min(orders.length, start + visibleCount);
  const slice = orders.slice(start, end);
  const offsetY = start * ESTIMATED_ROW_PX;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
    >
      <ul className="relative space-y-3" style={{ minHeight: totalHeight }}>
        <div className="absolute left-0 right-0 space-y-3" style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((order) => (
            <PickerOrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onStart={() => onStart(order.id)}
              onReady={() => onReady(order)}
            />
          ))}
        </div>
      </ul>
    </div>
  );
}

export const PickerOrderList = memo(PickerOrderListBase);
