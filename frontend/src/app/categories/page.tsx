'use client';

import Link from 'next/link';
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

const serviceCategories = [
  { name: 'Elektrik xizmatlari', emoji: '💡' },
  { name: 'Santexnik', emoji: '🚰' },
  { name: 'Usta chaqirish', emoji: '🛠️' },
  { name: 'Boshqalar', emoji: '📦' },
];

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

  const featured = useMemo(() => {
    const required = ['Oziq-ovqat', 'Qurilish mollari', 'Elektronika', 'Maishiy texnika'];
    const byName = new Map(categories.map((item) => [item.name.toLowerCase(), item]));
    return required.map((name) => byName.get(name.toLowerCase()) ?? null);
  }, [categories]);

  return (
    <main className="bb-page">
      <section className="bb-shell pb-24">
        <h1 className="text-2xl font-bold text-[#121212]">Kategoriyalar</h1>
        <p className="mt-1 text-sm text-slate-500">Kerakli bo'limni tanlang va mahsulotlarni tez toping.</p>

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
            ? categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="rounded-3xl bg-white p-3 shadow-sm transition active:scale-[0.98]"
                >
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl">{categoryEmoji(category.name)}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#121212]">{category.name}</p>
                  {typeof category.productCount === 'number' ? (
                    <p className="text-xs text-slate-500">{category.productCount} ta mahsulot</p>
                  ) : null}
                </Link>
              ))
            : null}
        </div>

        <div className="mt-6">
          <h2 className="text-base font-semibold text-[#121212]">Xizmatlar</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {serviceCategories.map((service) => (
              <div key={service.name} className="rounded-3xl border border-slate-200 bg-white p-3">
                <div className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                  {service.emoji}
                </div>
                <p className="mt-2 text-sm font-medium text-[#121212]">{service.name}</p>
                <p className="text-xs text-slate-500">Tez orada</p>
              </div>
            ))}
          </div>
        </div>

        {featured.some(Boolean) ? (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-[#121212]">Mashhur bo'limlar</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {featured
                .filter((item): item is Category => Boolean(item))
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/categories/${item.slug}`}
                    className="flex min-w-[132px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-xl">{categoryEmoji(item.name)}</span>
                    <span className="text-xs font-medium text-[#121212]">{item.name}</span>
                  </Link>
                ))}
            </div>
          </div>
        ) : null}
      </section>
      <MobileNav />
    </main>
  );
}

