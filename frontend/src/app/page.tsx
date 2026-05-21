import { HomePageClient } from '@/components/home/home-page-client';
import { fetchProductsPageServer } from '@/lib/storefront-api.server';

export default async function Home() {
  const initialCatalog = await fetchProductsPageServer({ page: 1, limit: 24 });
  return <HomePageClient initialCatalog={initialCatalog} />;
}
