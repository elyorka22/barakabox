'use client';

import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError'> & {
  src?: string | null;
  fallback?: ReactNode;
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
};

export function SafeImage({
  src,
  alt = '',
  fallback,
  fallbackClassName,
  fallbackStyle,
  className,
  onLoad,
  ...rest
}: SafeImageProps) {
  const [state, setState] = useState<{ src: string | null | undefined; errored: boolean }>(
    () => ({ src, errored: false }),
  );

  if (state.src !== src) {
    setState({ src, errored: false });
  }

  const errored = state.errored;

  if (!src || errored) {
    return (
      <div
        aria-hidden="true"
        className={
          fallbackClassName ??
          'flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-500'
        }
        style={fallbackStyle}
      >
        {fallback ?? (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={() => setState((prev) => ({ ...prev, errored: true }))}
    />
  );
}
