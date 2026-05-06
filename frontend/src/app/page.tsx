'use client';

import { useEffect, useState } from 'react';
import { api, authStorage, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { Header } from '@/components/header';
import { ProductCard } from '@/components/product-card';

type Product = { id: string; name: string; price: string };
const categories = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Bakery'];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const token = authStorage.getAccessToken();

  useEffect(() => {
    guestStorage.getGuestId();
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = async (productId: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/cart/items', { productId, quantity: 1 }, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <Header />
        <div className="mt-4 rounded-2xl bg-[#F3F4F6] px-3 py-2">
          <div className="flex items-center gap-2 text-gray-500">
            <span>🔎</span>
            <input className="w-full bg-transparent py-1 text-sm outline-none" placeholder="Search groceries" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-medium ${activeCategory === category ? 'bg-[#16A34A] text-white' : 'bg-white text-gray-600'}`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-3xl bg-gradient-to-r from-[#16A34A] to-green-500 p-5 text-white">
          <p className="text-xl font-bold leading-tight">Fresh groceries at your doorstep</p>
          <p className="mt-1 text-sm text-white/90">Fast delivery and best daily deals.</p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#121212]">Popular items</h2>
          <span className="text-sm text-[#16A34A]">See all</span>
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
              <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} onAdd={addProduct} loading={loading} href={`/products/${product.id}`} />
            ))}
          </div>
        ) : null}
        <MobileNav />
      </section>
    </main>
  );
}
