'use client';

import { useEffect, useState } from 'react';
import { api, categoryEvents } from '@/lib/api';
import { CategoryCard, CategoryCardSkeleton } from '@/components/home/category-card';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

function categoryEmoji(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('non')) return '🥖';
  if (lower.includes('sabzavot')) return '🥬';
  if (lower.includes('meva')) return '🍎';
  if (lower.includes('un')) return '🌾';
  if (lower.includes('quruq')) return '🥜';
  if (lower.includes('ichimlik')) return '🥤';
  if (lower.includes('ovqat')) return '🥩';
  if (lower.includes("xo'jalik")) return '🧼';
  return '🛒';
}

export function HomeCategoriesRow() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>('/categories?featured=1');
      const featured = data
        .filter((c) => c.isFeatured !== false && c.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCategories(featured);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
    const onCategoryChanged = () => void loadCategories();
    window.addEventListener(categoryEvents.changedEventName, onCategoryChanged);
    return () => window.removeEventListener(categoryEvents.changedEventName, onCategoryChanged);
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className="mt-4" aria-labelledby="home-categories-heading">
      <h2 id="home-categories-heading" className="sr-only">
        Kategoriyalar
      </h2>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4">
        {loading
          ? Array.from({ length: 8 }).map((_, idx) => (
              <CategoryCardSkeleton key={`cat-skel-${idx}`} />
            ))
          : categories.map((item) => (
              <CategoryCard
                key={item.id ?? item.slug}
                href={`/categories/${item.slug}`}
                name={item.name}
                imageUrl={item.imageUrl}
                fallbackEmoji={categoryEmoji(item.name)}
              />
            ))}
      </div>
    </section>
  );
}
