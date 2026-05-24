'use client';

import Link from 'next/link';
import { StoreCardLink } from '@/components/stores/store-card';
import type { StoreCard, StoreShowcase } from '@/lib/stores-api';

type SectionProps = {
  id: string;
  title: string;
  stores: StoreCard[];
  seeAllHref?: string;
};

function StoreSection({ id, title, stores, seeAllHref }: SectionProps) {
  if (stores.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby={id}>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 id={id} className="text-base font-semibold text-[#111827]">
          {title}
        </h2>
        {seeAllHref ? (
          <Link href={seeAllHref} className="text-xs font-semibold text-emerald-700">
            Barchasi
          </Link>
        ) : null}
      </div>
      <div className="bb-scrollbar-hide -mx-0.5 flex gap-3 overflow-x-auto pb-1">
        {stores.map((store) => (
          <StoreCardLink key={store.id} store={store} variant="carousel" />
        ))}
      </div>
    </section>
  );
}

type Props = {
  showcase: StoreShowcase | null;
  loading?: boolean;
};

export function HomeStoresShowcase({ showcase, loading }: Props) {
  if (loading) {
    return (
      <section className="mt-6 px-0.5">
        <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[148px] min-w-[168px] animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!showcase) return null;

  const hasAny =
    showcase.featured.length > 0 ||
    showcase.nearby.length > 0 ||
    showcase.top.length > 0 ||
    showcase.newlyAdded.length > 0;

  if (!hasAny) return null;

  return (
    <>
      <StoreSection
        id="home-stores-featured"
        title="Tavsiya etilgan do‘konlar"
        stores={showcase.featured}
        seeAllHref="/stores?section=featured"
      />
      <StoreSection
        id="home-stores-nearby"
        title="Yaqin atrofdagi do‘konlar"
        stores={showcase.nearby}
        seeAllHref="/stores?section=nearby"
      />
      <StoreSection
        id="home-stores-top"
        title="Eng yaxshi do‘konlar"
        stores={showcase.top}
        seeAllHref="/stores?section=top"
      />
      <StoreSection
        id="home-stores-new"
        title="Yangi do‘konlar"
        stores={showcase.newlyAdded}
        seeAllHref="/stores?section=new"
      />
    </>
  );
}
