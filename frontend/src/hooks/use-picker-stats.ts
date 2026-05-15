'use client';

import { useCallback, useEffect, useState } from 'react';
import { readPickerHistory, readPickerStats, tickPickerOnlineSeconds } from '@/lib/picker-storage';
import type { PickerDayStats, PickerHistoryEntry } from '@/lib/picker-types';

export function usePickerStats() {
  const [stats, setStats] = useState<PickerDayStats>(() => readPickerStats());
  const [history, setHistory] = useState<PickerHistoryEntry[]>(() => readPickerHistory());

  const refresh = useCallback(() => {
    setStats(readPickerStats());
    setHistory(readPickerHistory());
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => {
      tickPickerOnlineSeconds(30);
      refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const weekPicked = history.filter((h) => {
    const d = new Date(h.completedAt);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60_000;
    return d.getTime() >= weekAgo;
  }).length;

  const peakHour = (() => {
    const buckets = new Array(24).fill(0) as number[];
    for (const h of history) {
      const hr = new Date(h.completedAt).getHours();
      buckets[hr] += 1;
    }
    let max = 0;
    let hour = 10;
    buckets.forEach((c, i) => {
      if (c > max) {
        max = c;
        hour = i;
      }
    });
    return max > 0 ? `${hour}:00` : '—';
  })();

  return { stats, history, weekPicked, peakHour, refresh };
}
