'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

const TAB_ROUTES = new Set(['/', '/categories', '/client', '/profile']);

function getScrollKey(pathname: string) {
  return `bb:scroll:${pathname}`;
}

export function StorefrontScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!TAB_ROUTES.has(pathname)) {
      return;
    }

    try {
      const stored = sessionStorage.getItem(getScrollKey(pathname));
      const top = stored ? Number(stored) : 0;
      window.scrollTo({ top: Number.isFinite(top) ? top : 0, behavior: 'auto' });
    } catch {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname]);

  return null;
}
