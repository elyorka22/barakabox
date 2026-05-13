'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Filter, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { ProductCard } from '@/components/product-card';

type Product = {
  id: string;
  name: string;
  price: string;
  unitType?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};

const tabs = ['Barcha', 'Oziq-ovqat', 'Ichimliklar', 'Mevalar', "Go'sht"] as const;

export default function DiscountsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Barcha');

  const loadProducts = async () => {
    const data = await api.get<Product[]>('/products');
    setProducts(data);
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const discountedProducts = useMemo(() => {
    return products
      .filter((product) =>
        product.variants?.some(
          (variant) =>
            typeof variant.discountPrice === 'number' &&
            variant.discountPrice > 0 &&
            variant.discountPrice < Number(variant.price),
        ),
      )
      .filter((product) => {
        if (activeTab === 'Barcha') return true;
        const lower = activeTab.toLowerCase();
        return product.name.toLowerCase().includes(lower);
      });
  }, [products, activeTab]);

  return (
    <main className="bb-page bg-[#F8F8F8]">
      <section className="bb-shell bg-[#F8F8F8] pb-24">
        <div className="bb-header-sticky !top-2 !mx-0 flex items-center justify-between !rounded-none !bg-[#F8F8F8]/95 !px-0 !py-0 shadow-none">
          <Link href="/" className="text-lg font-semibold text-[#111111]">
            ← Aksiya va chegirmalar
          </Link>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600">
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeTab === tab ? 'bg-[#8B5CF6] text-white' : 'bg-white text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-3xl bg-[#8B5CF6] p-4 text-white">
          <h2 className="text-xl font-semibold">Eng yaxshi aksiyalar siz uchun!</h2>
          <p className="mt-1 text-sm text-white/85">Chegirmalarni boy bermang</p>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2">
          <p className="text-sm font-medium text-[#111111]">Aksiya tugashiga 03 : 12 : 45</p>
          <button className="flex items-center gap-1 rounded-xl bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            Filtr
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {discountedProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.02 }}
            >
              <ProductCard
                id={product.id}
                name={product.name}
                price={product.price}
                unitType={product.unitType ?? undefined}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                href={`/products/${product.id}`}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
              />
            </motion.div>
          ))}
        </div>
      </section>
      <MobileNav />
    </main>
  );
}

