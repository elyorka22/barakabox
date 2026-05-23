export const CACHE_TTL = {
  productsHome: 120,
  marketplaceHome: 120,
  marketplaceStores: 300,
  marketplaceStore: 120,
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
  marketplaceHome: () => 'storefront:marketplace:home:v1',
  marketplaceStores: (featured: boolean) =>
    `storefront:marketplace:stores:v1:${featured ? 'featured' : 'all'}`,
  marketplaceStore: (slug: string) =>
    `storefront:marketplace:store:v1:${encodeURIComponent(slug)}`,
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
