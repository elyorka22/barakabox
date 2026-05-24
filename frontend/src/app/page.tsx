import { HomePageClient } from '@/components/home/home-page-client';
import { fetchMarketplaceHomeServer } from '@/lib/marketplace-home';
import { fetchProductsPageServer } from '@/lib/storefront-api.server';

export default async function Home() {
  const [marketplaceHome, initialCatalog] = await Promise.all([
    fetchMarketplaceHomeServer(),
    fetchProductsPageServer({ page: 1, limit: 24 }),
  ]);
  const initialStores =
    marketplaceHome.featuredStores.length > 0
      ? marketplaceHome.featuredStores
      : (marketplaceHome.storeShowcase?.nearby ?? []);

  return (
    <HomePageClient
      initialCatalog={initialCatalog}
      catalogSource="legacy"
      initialStores={initialStores}
    />
  );
}
