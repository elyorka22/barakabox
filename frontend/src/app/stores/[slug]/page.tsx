import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchStoreBySlugServer } from '@/lib/marketplace-home';
import { SafeImage } from '@/components/safe-image';
import { MobileNav } from '@/components/app-nav';
import { StorePageTracker } from '@/components/stores/store-page-tracker';
import { StoreProductsGrid } from '@/components/stores/store-products-grid';

type Props = { params: Promise<{ slug: string }> };

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchStoreBySlugServer(slug);
  if (!data) notFound();

  const { store, products } = data;

  return (
    <main className="bb-page bg-[#F8F8F8] pb-24">
      <StorePageTracker storeId={store.id} storeSlug={store.slug} storeName={store.name} />
      <div className="bb-shell">
        <div className="bg-white px-4 py-4 shadow-sm">
          <Link href="/stores" className="text-xs font-semibold text-emerald-700">
            ← Do‘konlar
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
              {store.logoUrl ? (
                <SafeImage src={store.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl">🏪</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#111827]">{store.name}</h1>
              {store.address ? <p className="text-sm text-slate-500">{store.address}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <StoreProductsGrid products={products} storeName={store.name} />
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
