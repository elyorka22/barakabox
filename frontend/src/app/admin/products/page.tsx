'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  unitType: 'kg' | 'piece' | 'pack';
  businessId: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  imageThumbUrl?: string | null;
  imageUrl?: string | null;
};

type Business = { id: string; displayName: string };
type Category = { id: string; name: string; slug: string };

export default function AdminProductsPage() {
  const token = authStorage.getAccessToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    id: '',
    name: '',
    price: '1000',
    stockQuantity: '0',
    unitType: 'piece' as Product['unitType'],
    businessId: '',
    categoryId: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsData, businessesData, categoriesData] = await Promise.all([
        api.get<Product[]>('/products', token),
        api.get<Business[]>('/businesses/approved', token),
        api.get<Category[]>('/categories'),
      ]);
      setProducts(productsData);
      setBusinesses(businessesData);
      setCategories(categoriesData.filter((c) => c.slug !== 'all'));
      setForm((prev) => ({
        ...prev,
        businessId: prev.businessId || businessesData[0]?.id || '',
        categoryId: prev.categoryId || categoriesData.find((c) => c.slug !== 'all')?.id || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  const visible = useMemo(() => {
    const filtered = products.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = q.length === 0 || item.name.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'ALL' || item.category?.id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    const pageSize = 8;
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [products, search, categoryFilter, page]);

  const save = async () => {
    const payload = {
      businessId: form.businessId,
      name: form.name.trim(),
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity),
      unitType: form.unitType,
      categoryId: form.categoryId || undefined,
    };
    if (!payload.businessId || !payload.name || payload.price <= 0) return;
    if (form.id) {
      await api.patch(`/products/${form.id}`, payload, token);
    } else {
      await api.post('/products', payload, token);
    }
    setForm((prev) => ({ ...prev, id: '', name: '', price: '1000', stockQuantity: '0' }));
    await load();
  };

  const edit = (item: Product) => {
    setForm({
      id: item.id,
      name: item.name,
      price: String(item.price),
      stockQuantity: String(item.stockQuantity),
      unitType: item.unitType,
      businessId: item.businessId,
      categoryId: item.category?.id ?? '',
    });
  };

  const remove = async (id: string) => {
    await api.delete(`/products/${id}`, {}, token);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Product management</h2>
        <p className="text-sm text-slate-500">Create/edit/delete, category filter, stock status va pagination.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">Barcha kategoriyalar</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">{form.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nomi" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" value={form.stockQuantity} onChange={(e) => setForm((prev) => ({ ...prev, stockQuantity: e.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.businessId} onChange={(e) => setForm((prev) => ({ ...prev, businessId: e.target.value }))}>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.displayName}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.unitType} onChange={(e) => setForm((prev) => ({ ...prev, unitType: e.target.value as Product['unitType'] }))}>
            <option value="piece">piece</option>
            <option value="kg">kg</option>
            <option value="pack">pack</option>
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
            <option value="">Kategoriya yo'q</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white" onClick={() => void save()}>
            {form.id ? 'Yangilash' : 'Yaratish'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                {item.imageThumbUrl || item.imageUrl ? (
                  <img src={item.imageThumbUrl ?? item.imageUrl ?? ''} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-slate-100" />
                )}
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category?.name ?? "Kategoriya yo'q"}</p>
                </div>
              </div>
              <p className="mt-2 text-sm">{formatMoneyUz(item.price)}</p>
              <p className={`text-xs ${item.stockQuantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {item.stockQuantity > 0 ? `In stock: ${item.stockQuantity}` : 'Out of stock'}
              </p>
              <div className="mt-2 flex gap-2">
                <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs" onClick={() => edit(item)}>
                  Edit
                </button>
                <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
