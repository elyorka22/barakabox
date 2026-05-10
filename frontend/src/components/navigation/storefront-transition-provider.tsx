'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const SCROLL_KEY_PREFIX = 'bb:scroll:';
const TAB_ROUTES = new Set(['/', '/categories', '/client', '/profile']);

function getScrollKey(pathname: string) {
  return `${SCROLL_KEY_PREFIX}${pathname}`;
}

function isTabRoute(pathname: string) {
  return TAB_ROUTES.has(pathname);
}

export function StorefrontTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const [showOverlay, setShowOverlay] = useState(false);

  const shouldAnimate = useMemo(
    () => isTabRoute(pathname) || isTabRoute(previousPathRef.current),
    [pathname],
  );

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (previousPath !== pathname) {
      try {
        sessionStorage.setItem(getScrollKey(previousPath), String(window.scrollY));
      } catch {
        // Ignore storage write issues.
      }

      if (shouldAnimate) {
        setShowOverlay(true);
      }
    }

    const restore = () => {
      try {
        const stored = sessionStorage.getItem(getScrollKey(pathname));
        const target = stored ? Number(stored) : 0;
        window.scrollTo({ top: Number.isFinite(target) ? target : 0, behavior: 'auto' });
      } catch {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });

    const timer = window.setTimeout(() => setShowOverlay(false), 220);
    previousPathRef.current = pathname;

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [pathname, shouldAnimate]);

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldAnimate ? { opacity: 0, y: -6 } : {}}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            key="route-soft-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 z-20 bg-emerald-50/60"
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
