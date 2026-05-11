'use client';

import { motion } from 'framer-motion';
import { Funnel, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, categoryEvents } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { CategoryCard, CategoryCardSkeleton } from '@/components/home/category-card';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

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
        const payload = await api.get<Category[]>('/categories?active=true');
        setCategories(payload.filter((item) => item.slug !== 'all'));
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
    const onCategoryChanged = () => void load();
    window.addEventListener(categoryEvents.changedEventName, onCategoryChanged);
    return () => {
      window.removeEventListener(categoryEvents.changedEventName, onCategoryChanged);
    };
  }, []);

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return orderedCategories;
    const q = query.trim().toLowerCase();
    return orderedCategories.filter((item) => item.name.toLowerCase().includes(q));
  }, [orderedCategories, query]);

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

        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 9 }).map((_, index) => <CategoryCardSkeleton key={`cat-list-skeleton-${index}`} />)
            : filteredCategories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.18) }}
                  className="h-full"
                >
                  <CategoryCard
                    href={`/categories/${category.slug}`}
                    name={category.name}
                    imageUrl={category.imageUrl}
                    fallbackEmoji={categoryEmoji(category.name)}
                  />
                </motion.div>
              ))}
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

