export const CACHE_TTL = {
  productsHome: 120,
  productsList: 90,
  productsSearch: 60,
  categories: 300,
  banners: 300,
  deliverySettings: 300,
  publicSettings: 300,
  guestUser: 86400,
  orderTrack: 15,
  adminDashboard: 60,
} as const;

export const cacheKeys = {
  productsHome: () => 'storefront:products:home:v1',
  productsList: (page: number, limit: number, categoryId?: string, sort?: string) =>
    `storefront:products:list:v1:${page}:${limit}:${categoryId ?? 'all'}:${sort ?? 'newest'}`,
  productsSearch: (q: string, page: number, limit: number) =>
    `storefront:products:search:v1:${encodeURIComponent(q)}:${page}:${limit}`,
  categoriesPublic: (featured?: boolean) => `storefront:categories:v1:${featured ? 'featured' : 'all'}`,
  bannersActive: () => 'storefront:banners:active:v1',
  deliverySettings: () => 'settings:delivery:v1',
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
