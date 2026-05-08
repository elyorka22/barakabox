'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Funnel, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount?: number;
};

const REQUIRED_CATEGORIES = [
  'Oziq-ovqat',
  'Qurilish mollari',
  'Elektronika',
  'Maishiy texnika',
  'Elektrik xizmatlari',
  'Santexnik',
  'Usta chaqirish',
  'Boshqalar',
] as const;

function categoryEmoji(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('oziq')) return '🥬';
  if (normalized.includes('qurilish')) return '🧱';
  if (normalized.includes('elektron')) return '📱';
  if (normalized.includes('maishiy')) return '🧺';
  if (normalized.includes('elektrik')) return '💡';
  if (normalized.includes('santex')) return '🚰';
  if (normalized.includes('usta')) return '🛠️';
  return '📦';
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await api.get<Category[]>('/categories');
        setCategories(payload.filter((item) => item.slug !== 'all'));
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const mergedCategories = useMemo(() => {
    const byName = new Map(categories.map((item) => [item.name.toLowerCase(), item]));
    const required = REQUIRED_CATEGORIES.map((name) => {
      const entry = byName.get(name.toLowerCase());
      if (entry) return entry;
      return { id: `fallback-${name}`, name, slug: 'categories', imageUrl: null, productCount: 0 };
    });
    const dynamicExtra = categories.filter(
      (item) => !REQUIRED_CATEGORIES.some((requiredName) => requiredName.toLowerCase() === item.name.toLowerCase()),
    );
    return [...required, ...dynamicExtra];
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return mergedCategories;
    const q = query.trim().toLowerCase();
    return mergedCategories.filter((item) => item.name.toLowerCase().includes(q));
  }, [mergedCategories, query]);

  return (
    <main className="bb-page">
      <section className="bb-shell pb-24">
        <h1 className="text-2xl font-bold text-[#111111]">Kategoriyalar</h1>
        <p className="mt-1 text-sm text-slate-500">Bo'limlarni tanlang va kerakli mahsulotni tez toping.</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_6px_14px_rgba(17,24,39,0.06)]">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-slate-500">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Kategoriya qidirish"
            />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] text-slate-600">
            <Funnel className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-3xl bg-white p-3 shadow-sm">
                  <div className="bb-skeleton h-24 w-full" />
                  <div className="bb-skeleton mt-2 h-3 w-2/3" />
                </div>
              ))
            : null}

          {!loading
            ? filteredCategories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <Link
                    href={category.slug === 'categories' ? '/categories' : `/categories/${category.slug}`}
                    className="block rounded-3xl bg-white p-3 shadow-[0_8px_16px_rgba(17,24,39,0.06)]"
                  >
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-[#F3F4F6]">
                      {category.imageUrl ? (
                        <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl">{categoryEmoji(category.name)}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#111111]">{category.name}</p>
                    <p className="text-xs text-slate-500">
                      {typeof category.productCount === 'number' ? `${category.productCount} ta mahsulot` : 'Bo‘lim'}
                    </p>
                  </Link>
                </motion.div>
              ))
            : null}
        </div>
        {!loading && filteredCategories.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm text-slate-500">
            Qidiruv bo‘yicha kategoriya topilmadi
          </p>
        ) : null}
      </section>
      <MobileNav />
    </main>
  );
}

