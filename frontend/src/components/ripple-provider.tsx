'use client';

import { useEffect } from 'react';

const RIPPLE_SELECTOR =
  '.bb-btn-primary, .bb-btn-secondary, .bb-btn-outline, .bb-card-product, .bb-mobile-nav a';

export function RippleProvider() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const rippleHost = target.closest(RIPPLE_SELECTOR) as HTMLElement | null;
      if (!rippleHost) return;

      const rect = rippleHost.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      rippleHost.style.setProperty('--bb-ripple-x', `${x}px`);
      rippleHost.style.setProperty('--bb-ripple-y', `${y}px`);
      rippleHost.classList.remove('bb-rippling');
      requestAnimationFrame(() => rippleHost.classList.add('bb-rippling'));
      setTimeout(() => rippleHost.classList.remove('bb-rippling'), 600);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return null;
}
