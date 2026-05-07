'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, authStorage, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { Header } from '@/components/header';
import { ProductCard } from '@/components/product-card';

type Product = {
  id: string;
  name: string;
  price: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  variants?: Array<{
    id: string;
    title: string;
    flavor?: string | null;
    size?: string | null;
    price: number;
    stock: number;
    imageUrl?: string | null;
  }>;
};
type CartResponse = {
  items: Array<{
    id: string;
    quantity: number;
    product?: { id: string } | null;
    variant?: { id: string } | null;
  }>;
};
type Category = { id: string; name: string; slug: string; imageUrl?: string | null; productCount: number };

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState('');
  const token = authStorage.getAccessToken();

  useEffect(() => {
    guestStorage.getGuestId();
    void loadCategories();
    void loadProducts();
    void loadCart();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCart = async () => {
    try {
      const data = await api.get<CartResponse>('/cart', token, true);
      setCart(data);
    } catch {
      setCart(null);
    }
  };

  const addProduct = async (variantId: string, productId: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/cart/items', { productId, variantId, quantity: 1 }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotni savatga qo'shib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const changeProductQty = async (variantId: string, productId: string, delta: number) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/cart/items', { productId, variantId, quantity: delta }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const qtyByProductId = (productId: string) => cart?.items.find((item) => item.product?.id === productId)?.quantity ?? 0;

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <Header />
        <div className="mt-4 rounded-2xl bg-[#F3F4F6] px-3 py-2">
          <div className="flex items-center gap-2 text-gray-500">
            <span>🔎</span>
            <input className="w-full bg-transparent py-1 text-sm outline-none" placeholder="Mahsulotlarni qidirish" />
          </div>
        </div>
        <div className="mt-4 rounded-3xl bg-gradient-to-r from-[#16A34A] to-green-500 px-5 pb-10 pt-10 text-white">
          <p className="text-xl font-bold leading-tight">Yangi mahsulotlar eshigingizgacha</p>
          <p className="mt-1 text-sm text-white/90">Tez yetkazib berish va eng yaxshi kundalik narxlar.</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {loadingCategories
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-white p-2">
                  <div className="bb-skeleton h-12 w-12 rounded-full" />
                  <div className="bb-skeleton h-3 w-12" />
                </div>
              ))
            : null}
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="flex min-w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-white p-2"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#F3F4F6]">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-500">No image</span>
                )}
              </div>
              <span className="line-clamp-2 text-center text-xs font-medium text-gray-600">{category.name}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#121212]">Mashhur mahsulotlar</h2>
          <span className="text-sm text-[#16A34A]">Barchasini ko'rish</span>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {loadingProducts ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-white p-3">
                <div className="bb-skeleton h-28" />
                <div className="bb-skeleton mt-3 h-4 w-2/3" />
                <div className="bb-skeleton mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : null}
        {!loadingProducts ? (
          <div className="mt-4 grid grid-cols-2 gap-3 pb-24">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                onAdd={addProduct}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                onIncrease={(variantId, productId) => void changeProductQty(variantId, productId, 1)}
                onDecrease={(variantId, productId) => void changeProductQty(variantId, productId, -1)}
                quantity={qtyByProductId(product.id)}
                loading={loading}
                href={`/products/${product.id}`}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
              />
            ))}
          </div>
        ) : null}
        <MobileNav />
      </section>
    </main>
  );
}
