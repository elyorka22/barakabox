export const CACHE_TTL = {
  productsHome: 120,
  marketplaceHome: 120,
  marketplaceStores: 300,
  marketplaceStore: 120,
  storesFeatured: 300,
  storesShowcase: 120,
  storesList: 180,
  storeDetail: 120,
  storeProducts: 90,
  marketplaceCatalog: 90,
  marketplacePopular: 120,
  marketplacePromotions: 90,
  marketplaceSearch: 60,
  productsTop: 120,
  productsPromotions: 120,
  productsList: 90,
  productsSearch: 60,
  categories: 300,
  banners: 300,
  deliverySettings: 300,
  schedulingSettings: 300,
  deliverySlots: 60,
  publicSettings: 300,
  guestUser: 86400,
  orderTrack: 15,
  adminDashboard: 60,
} as const;

export const cacheKeys = {
  productsHome: () => 'storefront:products:home:v1',
  marketplaceHome: () => 'storefront:marketplace:home:v6',
  marketplaceStores: (featured: boolean) =>
    `storefront:marketplace:stores:v1:${featured ? 'featured' : 'all'}`,
  marketplaceStore: (slug: string) =>
    `storefront:marketplace:store:v1:${encodeURIComponent(slug)}`,
  storesFeatured: () => 'storefront:stores:featured:v1',
  storesShowcase: () => 'storefront:stores:showcase:v3',
  storesList: (
    section: string | undefined,
    page: number,
    limit: number,
    lat?: number,
    lng?: number,
  ) =>
    `storefront:stores:list:v1:${section ?? 'all'}:${page}:${limit}:${lat ?? '_'}:${lng ?? '_'}`,
  storeDetail: (slug: string) => `storefront:stores:detail:v1:${encodeURIComponent(slug)}`,
  storeProducts: (
    slug: string,
    page: number,
    limit: number,
    q?: string,
    categoryId?: string,
    promo?: boolean,
  ) =>
    `storefront:stores:products:v1:${encodeURIComponent(slug)}:${page}:${limit}:${q ? encodeURIComponent(q) : '_'}:${categoryId ?? '_'}:${promo ? '1' : '0'}`,
  marketplaceCatalog: (
    page: number,
    limit: number,
    categoryId?: string,
    q?: string,
    sort?: string,
    storeId?: string,
  ) =>
    `storefront:marketplace:catalog:v1:${page}:${limit}:${categoryId ?? '_'}:${q ? encodeURIComponent(q) : '_'}:${sort ?? 'newest'}:${storeId ?? '_'}`,
  marketplacePopular: (limit: number) => `storefront:marketplace:popular:v1:${limit}`,
  marketplacePromotions: (page: number, limit: number) =>
    `storefront:marketplace:promotions:v1:${page}:${limit}`,
  marketplaceSearch: (q: string, page: number, limit: number) =>
    `storefront:marketplace:search:v1:${encodeURIComponent(q)}:${page}:${limit}`,
  productsTop: (limit: number) => `storefront:products:top:v1:${limit}`,
  productsPromotions: (catalogVersion: number, page: number, limit: number, sort: string) =>
    `storefront:products:promotions:v1:${catalogVersion}:${page}:${limit}:${sort}`,
  productsList: (
    page: number,
    limit: number,
    categoryId?: string,
    businessId?: string,
    search?: string,
    sort?: string,
  ) =>
    `storefront:products:list:v2:${page}:${limit}:${categoryId ?? 'all'}:${businessId ?? 'all'}:${search ? encodeURIComponent(search) : '_'}:${sort ?? 'newest'}`,
  productsSearch: (q: string, page: number, limit: number) =>
    `storefront:products:search:v1:${encodeURIComponent(q)}:${page}:${limit}`,
  categoriesPublic: (featured?: boolean) => `storefront:categories:v1:${featured ? 'featured' : 'all'}`,
  bannersActive: () => 'storefront:banners:active:v1',
  deliverySettings: () => 'settings:delivery:v1',
  schedulingSettings: () => 'settings:scheduling:v1',
  deliverySlots: (dateKey: string) => `settings:delivery-slots:v1:${dateKey}`,
  publicSettings: () => 'settings:public:v1',
  guestUserId: (guestId: string) => `guest:userId:v1:${guestId}`,
  orderTrack: (token: string) => `order:track:v1:${token}`,
  adminDashboard: (period: string) => `admin:dashboard:v1:${period}`,
  catalogVersion: () => 'storefront:catalog:version',
};

export const CACHE_PREFIXES = {
  products: 'storefront:products:',
  storefront: 'storefront:',
  settings: 'settings:',
  adminDashboard: 'admin:dashboard:',
};
