'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StorefrontProduct } from '@/types/storefront-product';

type ProductSheetContextValue = {
  product: StorefrontProduct | null;
  isOpen: boolean;
  openProduct: (product: StorefrontProduct) => void;
  closeProduct: () => void;
  registerCatalog: (products: StorefrontProduct[]) => void;
  openProductById: (id: string) => boolean;
};

const ProductSheetContext = createContext<ProductSheetContextValue | null>(null);

export function ProductSheetProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] = useState<StorefrontProduct[]>([]);

  const registerCatalog = useCallback((products: StorefrontProduct[]) => {
    setCatalog(products);
  }, []);

  const openProduct = useCallback((p: StorefrontProduct) => {
    setProduct(p);
    setIsOpen(true);
  }, []);

  const openProductById = useCallback(
    (id: string) => {
      const found = catalog.find((p) => p.id === id);
      if (!found) return false;
      openProduct(found);
      return true;
    },
    [catalog, openProduct],
  );

  const closeProduct = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      product,
      isOpen,
      openProduct,
      closeProduct,
      registerCatalog,
      openProductById,
    }),
    [product, isOpen, openProduct, closeProduct, registerCatalog, openProductById],
  );

  return <ProductSheetContext.Provider value={value}>{children}</ProductSheetContext.Provider>;
}

export function useProductSheet() {
  const ctx = useContext(ProductSheetContext);
  if (!ctx) {
    throw new Error('useProductSheet must be used within ProductSheetProvider');
  }
  return ctx;
}

export function useProductSheetOptional() {
  return useContext(ProductSheetContext);
}
