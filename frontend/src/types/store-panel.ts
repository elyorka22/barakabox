import type { BusinessDashboard } from '@/types/business-dashboard';

export type StoreListing = {
  id: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  cashbackType: string;
  cashbackValue: number;
  isVisible: boolean;
  isTop: boolean;
  topOrder: number;
  globalProduct: {
    id: string;
    name: string;
    brand: string | null;
    imageThumbUrl: string | null;
    imageUrl: string | null;
    category: { id: string; name: string } | null;
  };
  globalVariant: { id: string; type: string; value: string } | null;
};

export type StorePanelDashboard = {
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    address: string | null;
    phone: string | null;
    deliveryPrice: number;
    minOrderPrice: number;
  } | null;
  marketplace: {
    kpis: {
      totalListings: number;
      visibleListings: number;
      hiddenListings: number;
      lowStockCount: number;
      outOfStockCount: number;
      topCount: number;
      teamCount: number;
    };
    inventory: {
      lowStock: Array<{ id: string; name: string; stock: number; imageUrl: string | null }>;
      outOfStock: Array<{ id: string; name: string; stock: number; imageUrl: string | null }>;
    };
  } | null;
  legacy: BusinessDashboard | null;
};

export type StoreTeamMember = {
  id: string;
  fullName: string;
  staffLogin: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  storeScopeId: string | null;
};
