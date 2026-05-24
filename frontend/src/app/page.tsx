import { HomePageClient } from '@/components/home/home-page-client';
import { fetchMarketplaceHomeServer } from '@/lib/marketplace-home';
import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';
import { fetchProductsPageServer } from '@/lib/storefront-api.server';

export default async function Home() {
  const marketplaceEnabled = isMarketplaceEnabled();
  const marketplaceHome = marketplaceEnabled ? await fetchMarketplaceHomeServer() : null;
  const initialCatalog = await fetchProductsPageServer({ page: 1, limit: 24 });
  const initialStores =
    marketplaceEnabled && marketplaceHome
      ? marketplaceHome.featuredStores.length > 0
        ? marketplaceHome.featuredStores
        : (marketplaceHome.storeShowcase?.nearby ?? [])
      : [];

  return (
    <HomePageClient
      initialCatalog={initialCatalog}
      catalogSource="legacy"
      initialStores={initialStores}
      marketplaceEnabled={marketplaceEnabled}
    />
  );
}
