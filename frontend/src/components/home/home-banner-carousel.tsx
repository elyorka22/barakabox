'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { SafeImage } from '@/components/safe-image';

export type HomeBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  overlayOpacity: number;
  isActive: boolean;
  sortOrder: number;
};

const AUTO_PLAY_MS = 5000;
const TOUCH_PAUSE_MS = 6000;
const SWIPE_THRESHOLD_PX = 48;
const DRAG_COMMIT_RATIO = 0.18;

export function HomeBannerCarousel() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDesktopNav, setShowDesktopNav] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const isHoveringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isTouchingRef = useRef(false);
  const touchPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.get<HomeBanner[]>('/banners?active=true');
        if (cancelled) return;
        const ordered = (Array.isArray(data) ? data : [])
          .filter((banner) => banner.isActive !== false)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setBanners(ordered);
        setIndex(0);
      } catch {
        if (!cancelled) setBanners([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = banners.length;
  const activeIndex = count === 0 ? 0 : ((index % count) + count) % count;

  const pauseAutoPlay = useCallback(() => {
    isTouchingRef.current = true;
    if (touchPauseTimer.current) clearTimeout(touchPauseTimer.current);
    touchPauseTimer.current = setTimeout(() => {
      isTouchingRef.current = false;
    }, TOUCH_PAUSE_MS);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const normalized = ((next % count) + count) % count;
      setIndex(normalized);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (count <= 1 || prefersReducedMotion.current) return;
    const timer = window.setInterval(() => {
      if (isHoveringRef.current || isDraggingRef.current || isTouchingRef.current) return;
      goNext();
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, goNext]);

  useEffect(() => {
    return () => {
      if (touchPauseTimer.current) clearTimeout(touchPauseTimer.current);
    };
  }, []);

  const finishDrag = useCallback(
    (deltaX: number, width: number) => {
      const threshold = Math.max(SWIPE_THRESHOLD_PX, width * DRAG_COMMIT_RATIO);
      if (Math.abs(deltaX) >= threshold) {
        goTo(deltaX < 0 ? activeIndex + 1 : activeIndex - 1);
      }
      setDragOffsetPx(0);
      setIsDragging(false);
      isDraggingRef.current = false;
      pointerStartX.current = null;
      pointerStartY.current = null;
      pauseAutoPlay();
    },
    [activeIndex, goTo, pauseAutoPlay],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    pauseAutoPlay();
    pointerStartX.current = event.clientX;
    pointerStartY.current = event.clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || pointerStartX.current === null) return;
    const deltaX = event.clientX - pointerStartX.current;
    const deltaY = event.clientY - (pointerStartY.current ?? event.clientY);
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2) return;
    setDragOffsetPx(deltaX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || pointerStartX.current === null) return;
    const width = viewportRef.current?.clientWidth ?? 1;
    const deltaX = event.clientX - pointerStartX.current;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    finishDrag(deltaX, width);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    pauseAutoPlay();
    pointerStartX.current = event.touches[0]?.clientX ?? null;
    pointerStartY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (count <= 1 || pointerStartX.current === null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const width = viewportRef.current?.clientWidth ?? 1;
    const deltaX = touch.clientX - pointerStartX.current;
    finishDrag(deltaX, width);
  };

  if (!loaded) {
    return (
      <div className="bb-skeleton mt-3 aspect-[2/1] w-full rounded-3xl sm:aspect-[16/7]" aria-hidden="true" />
    );
  }

  if (count === 0) {
    return null;
  }

  const translatePercent = -activeIndex * 100;
  const hasMultiple = count > 1;

  return (
    <section
      aria-label="Bosh sahifa bannerlari"
      aria-roledescription="carousel"
      className="relative mt-3"
      onMouseEnter={() => {
        isHoveringRef.current = true;
        setShowDesktopNav(true);
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        setShowDesktopNav(false);
      }}
    >
      <div className="relative">
        <div
          ref={viewportRef}
          className="touch-pan-y overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.04]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className={`flex will-change-transform ${isDragging ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
            style={{
              transform: `translate3d(calc(${translatePercent}% + ${isDragging ? `${dragOffsetPx}px` : '0px'}), 0, 0)`,
            }}
          >
            {banners.map((banner, idx) => (
              <BannerSlide key={banner.id} banner={banner} priority={idx === 0} />
            ))}
          </div>
        </div>

        {hasMultiple ? (
          <>
            <button
              type="button"
              aria-label="Oldingi banner"
              onClick={() => {
                pauseAutoPlay();
                goPrev();
              }}
              className={`absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-300 md:flex ${
                showDesktopNav ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Keyingi banner"
              onClick={() => {
                pauseAutoPlay();
                goNext();
              }}
              className={`absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-300 md:flex ${
                showDesktopNav ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div
          className="mt-2.5 flex items-center justify-center gap-1.5 px-1"
          role="tablist"
          aria-label="Banner sahifalari"
        >
          {banners.map((banner, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={banner.id}
                type="button"
                role="tab"
                onClick={() => {
                  pauseAutoPlay();
                  goTo(idx);
                }}
                aria-label={`Banner ${idx + 1}`}
                aria-selected={isActive}
                className={`h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? 'w-7 bg-[#22c55e] shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
                    : 'w-1.5 bg-slate-300/90 hover:bg-slate-400/90'
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function BannerSlide({ banner, priority }: { banner: HomeBanner; priority: boolean }) {
  const backgroundColor = banner.backgroundColor ?? '#0FA34B';
  const textColor = banner.textColor ?? '#FFFFFF';
  const overlay = Math.max(0, Math.min(100, banner.overlayOpacity ?? 0));
  const altText = banner.title?.trim() || 'Banner';
  const hasTextContent = Boolean(banner.title || banner.subtitle || banner.buttonText);

  const content = hasTextContent ? (
    <div className="absolute inset-0 flex w-full flex-col justify-end gap-2 p-4 sm:p-5" style={{ color: textColor }}>
      {banner.title ? (
        <p className="max-w-[80%] text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">{banner.title}</p>
      ) : null}
      {banner.subtitle ? (
        <p className="max-w-[82%] text-[13px] leading-snug opacity-95">{banner.subtitle}</p>
      ) : null}
      {banner.buttonText ? (
        <span className="mt-1 inline-block w-fit rounded-2xl bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm">
          {banner.buttonText}
        </span>
      ) : null}
    </div>
  ) : null;

  const slideInner = (
    <div className="relative aspect-[2/1] w-full sm:aspect-[16/7]" style={{ backgroundColor }}>
      <SafeImage
        src={banner.imageUrl ?? undefined}
        alt={altText}
        className="absolute inset-0 h-full w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        fallbackClassName="absolute inset-0 h-full w-full"
        fallback={<span aria-hidden="true" />}
      />
      {overlay > 0 ? <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} /> : null}
      {content}
    </div>
  );

  return (
    <article className="min-w-full flex-[0_0_100%] select-none" aria-roledescription="slide">
      {banner.buttonLink ? (
        <Link href={banner.buttonLink} className="block w-full" aria-label={altText} draggable={false}>
          {slideInner}
        </Link>
      ) : (
        slideInner
      )}
    </article>
  );
}
