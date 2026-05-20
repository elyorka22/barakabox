'use client';

import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { normalizeAssetUrl } from '@/lib/asset-url';

type SafeImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  width?: number;
  height?: number;
  onReady?: () => void;
  /** Ignored — kept for call-site compatibility with legacy img usage. */
  decoding?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  draggable?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
};

export function SafeImage({
  src,
  alt = '',
  className,
  fallback,
  fallbackClassName,
  fallbackStyle,
  loading = 'lazy',
  sizes = '(max-width: 768px) 50vw, 200px',
  width = 400,
  height = 400,
  onReady,
}: SafeImageProps) {
  const normalizedSrc = useMemo(() => normalizeAssetUrl(src), [src]);
  const [errored, setErrored] = useState(false);

  if (!normalizedSrc || errored) {
    onReady?.();
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
            aria-hidden
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
    <Image
      src={normalizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      sizes={sizes}
      onLoad={() => onReady?.()}
      onError={() => {
        setErrored(true);
        onReady?.();
      }}
    />
  );
}
