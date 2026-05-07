'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Category = { id: string; name: string; slug: string; imageUrl?: string | null; isActive?: boolean };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<Category[]>('/categories');
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kategoriyalarni yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-slate-500">Kategoriya ro‘yxati va holati.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-56 w-full" /> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-slate-100 p-3">
              <p className="font-semibold">{category.name}</p>
              <p className="text-xs text-slate-500">{category.slug}</p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {category.isActive === false ? 'INACTIVE' : 'ACTIVE'}
              </span>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
