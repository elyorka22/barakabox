'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export type HomeBanner = {
  id: string;
  title: string;
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

const AUTO_PLAY_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

export function HomeBannerCarousel() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isHoveringRef = useRef(false);

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

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (isHoveringRef.current) return;
      setIndex((prev) => (prev + 1) % banners.length);
    }, AUTO_PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const activeIndex = useMemo(() => {
    if (banners.length === 0) return 0;
    return ((index % banners.length) + banners.length) % banners.length;
  }, [index, banners.length]);

  const goTo = (next: number) => {
    if (banners.length === 0) return;
    const normalized = ((next % banners.length) + banners.length) % banners.length;
    setIndex(normalized);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1);
  };

  if (!loaded) {
    return (
      <div className="bb-skeleton mt-3 aspect-[16/8] w-full rounded-3xl" aria-hidden="true" />
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Bosh sahifa bannerlari"
      className="relative mt-3 overflow-hidden rounded-3xl shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
      onMouseEnter={() => {
        isHoveringRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className="relative w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex w-full transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translate3d(${-activeIndex * 100}%, 0, 0)` }}
        >
          {banners.map((banner, idx) => (
            <BannerSlide
              key={banner.id}
              banner={banner}
              priority={idx === 0}
            />
          ))}
        </div>
      </div>

      {banners.length > 1 ? (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {banners.map((banner, idx) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Banner ${idx + 1}`}
              className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BannerSlide({ banner, priority }: { banner: HomeBanner; priority: boolean }) {
  const backgroundColor = banner.backgroundColor ?? '#0FA34B';
  const textColor = banner.textColor ?? '#FFFFFF';
  const overlay = Math.max(0, Math.min(100, banner.overlayOpacity ?? 0));

  const content = (
    <div className="absolute inset-0 flex w-full flex-col justify-end gap-2 p-4 sm:p-5" style={{ color: textColor }}>
      <p className="max-w-[80%] text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">
        {banner.title}
      </p>
      {banner.subtitle ? (
        <p className="max-w-[82%] text-[13px] leading-snug opacity-95">
          {banner.subtitle}
        </p>
      ) : null}
      {banner.buttonText ? (
        <span className="mt-1 inline-block w-fit rounded-2xl bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm">
          {banner.buttonText}
        </span>
      ) : null}
    </div>
  );

  const slideInner = (
    <div
      className="relative h-full w-full"
      style={{ backgroundColor }}
    >
      {banner.imageUrl ? (
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
        />
      ) : null}
      {overlay > 0 ? (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} />
      ) : null}
      {content}
    </div>
  );

  return (
    <div className="aspect-[16/8] w-full shrink-0">
      {banner.buttonLink ? (
        <Link href={banner.buttonLink} className="block h-full w-full" aria-label={banner.title}>
          {slideInner}
        </Link>
      ) : (
        slideInner
      )}
    </div>
  );
}
