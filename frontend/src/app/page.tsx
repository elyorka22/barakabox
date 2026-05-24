import { HomePageClient } from '@/components/home/home-page-client';
import { fetchMarketplaceCatalogPageServer } from '@/lib/marketplace-catalog.server';
import { fetchProductsPageServer } from '@/lib/storefront-api.server';

const marketplaceCatalogOnly =
  process.env.NEXT_PUBLIC_MARKETPLACE_CATALOG_ONLY === 'true' ||
  process.env.NEXT_PUBLIC_MARKETPLACE_CATALOG_ONLY === '1';

export default async function Home() {
  const marketplaceCatalog = await fetchMarketplaceCatalogPageServer({ page: 1, limit: 24 });
  const legacyCatalog = marketplaceCatalogOnly
    ? null
    : await fetchProductsPageServer({ page: 1, limit: 24 });

  const useMarketplace = marketplaceCatalogOnly || marketplaceCatalog.total > 0;
  const initialCatalog = useMarketplace
    ? marketplaceCatalog
    : (legacyCatalog ?? marketplaceCatalog);

  return (
    <HomePageClient
      initialCatalog={initialCatalog}
      catalogSource={useMarketplace ? 'marketplace' : 'legacy'}
    />
  );
}
