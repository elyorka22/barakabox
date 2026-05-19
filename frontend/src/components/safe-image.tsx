'use client';

import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { normalizeAssetUrl } from '@/lib/asset-url';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError'> & {
  src?: string | null;
  fallback?: ReactNode;
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
  /** Called when image is ready to show (loaded, error, or missing). */
  onReady?: () => void;
};

export function SafeImage({
  src,
  alt = '',
  fallback,
  fallbackClassName,
  fallbackStyle,
  className,
  onLoad,
  onReady,
  ...rest
}: SafeImageProps) {
  const normalizedSrc = useMemo(() => normalizeAssetUrl(src), [src]);
  const [state, setState] = useState<{ src: string; errored: boolean }>(() => ({
    src: normalizedSrc,
    errored: false,
  }));

  if (state.src !== normalizedSrc) {
    setState({ src: normalizedSrc, errored: false });
  }

  const errored = state.errored;
  const showFallback = !normalizedSrc || errored;

  useEffect(() => {
    if (showFallback) onReady?.();
  }, [showFallback, onReady]);

  if (showFallback) {
    return (
      <div
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={
          fallbackClassName ??
          'flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-500'
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
      src={normalizedSrc}
      alt={alt}
      className={className}
      onLoad={(e) => {
        onLoad?.(e);
        onReady?.();
      }}
      onError={() => {
        setState((prev) => ({ ...prev, errored: true }));
        onReady?.();
      }}
    />
  );
}
