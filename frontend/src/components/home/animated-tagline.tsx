'use client';

import { useEffect, useState } from 'react';

const TAGLINES = [
  "Bozorlik qilish hech qachon bu darajada oson bo'lmagan",
  'Asablar, vaqt va qulaylikni endi sotib ololasiz!',
];

const ROTATE_INTERVAL_MS = 3800;

export function AnimatedTagline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (TAGLINES.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % TAGLINES.length);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p
      aria-live="polite"
      className="mb-2 px-1 text-left text-[12px] font-medium leading-snug text-slate-500 sm:text-[13px]"
    >
      <span key={index} className="bb-tagline-text inline-block">
        {TAGLINES[index]}
      </span>
    </p>
  );
}
