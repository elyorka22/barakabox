import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MobileNav } from '@/components/app-nav';
import { StorePageTracker } from '@/components/stores/store-page-tracker';
import { StoreHero, StorePageClient } from '@/components/stores/store-page-client';
import { fetchStoreDetailServer, fetchStoreProductsServer } from '@/lib/stores-api';

type Props = { params: Promise<{ slug: string }> };

export default async function StoreShowcasePage({ params }: Props) {
  const { slug } = await params;
  const detail = await fetchStoreDetailServer(slug);
  if (!detail) notFound();

  const productsPage = await fetchStoreProductsServer(slug, { page: 1, limit: 24 });

  return (
    <main className="bb-page bg-[#F8F8F8] pb-24">
      <StorePageTracker
        storeId={detail.store.id}
        storeSlug={detail.store.slug}
        storeName={detail.store.name}
      />
      <div className="bb-shell">
        <div className="bg-white px-4 py-3 shadow-sm">
          <Link href="/stores" className="text-xs font-semibold text-emerald-700">
            ← Do‘konlar
          </Link>
        </div>
        <StoreHero store={detail.store} />
        <StorePageClient
          initialDetail={detail}
          initialProducts={productsPage?.items ?? []}
          initialTotalPages={productsPage?.totalPages ?? 1}
        />
      </div>
      <MobileNav />
    </main>
  );
}
