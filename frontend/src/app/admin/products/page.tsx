'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { ImageUploader } from '@/components/admin/image-uploader';

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
  imageKey?: string | null;
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
    imageUrl: '',
    imageKey: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
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
      imageUrl: form.imageUrl || undefined,
      imageKey: form.imageKey || undefined,
    };
    if (!payload.businessId || !payload.name || payload.price <= 0) return;
    if (form.id) {
      await api.patch(`/products/${form.id}`, payload, token);
    } else {
      await api.post('/products', payload, token);
    }
    setForm((prev) => ({
      ...prev,
      id: '',
      name: '',
      price: '1000',
      stockQuantity: '0',
      imageUrl: '',
      imageKey: '',
    }));
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
      imageUrl: item.imageUrl ?? '',
      imageKey: item.imageKey ?? '',
    });
  };

  const remove = async (id: string) => {
    await api.delete(`/products/${id}`, {}, token);
    await load();
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Product management</h2>
        <p className="text-sm text-slate-500">Create/edit/delete, category filter, stock status va pagination.</p>
        <div className="mt-3 grid min-w-0 max-w-full gap-2 md:grid-cols-4">
          <input
            className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="min-w-0 max-w-full">
            <select className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">Barcha kategoriyalar</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Mahsulot kategoriyasini tanlang</p>
          </div>
          <button className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <button className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="text-sm font-semibold">{form.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
        <div className="mt-2 grid min-w-0 max-w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 max-w-full">
            <label className="mb-1 block text-xs font-medium text-slate-700">Mahsulot nomi</label>
            <input
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Masalan: Tvorog Bomazza"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="min-w-0 max-w-full">
            <label className="mb-1 block text-xs font-medium text-slate-700">Narx</label>
            <input
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              type="number"
              placeholder="Masalan: 18000"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            />
          </div>
          <div className="min-w-0 max-w-full">
            <label className="mb-1 block text-xs font-medium text-slate-700">Qoldiq</label>
            <input
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              type="number"
              placeholder="Masalan: 25"
              value={form.stockQuantity}
              onChange={(e) => setForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
            />
          </div>
          <select className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.businessId} onChange={(e) => setForm((prev) => ({ ...prev, businessId: e.target.value }))}>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.displayName}
              </option>
            ))}
          </select>
          <select className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.unitType} onChange={(e) => setForm((prev) => ({ ...prev, unitType: e.target.value as Product['unitType'] }))}>
            <option value="piece">piece</option>
            <option value="kg">kg</option>
            <option value="pack">pack</option>
          </select>
          <div className="min-w-0 max-w-full">
            <select className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
              <option value="">Kategoriya yo'q</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Mahsulot kategoriyasini tanlang</p>
          </div>
          <div className="min-w-0 max-w-full sm:col-span-2 lg:col-span-3">
            <ImageUploader
              valueUrl={form.imageUrl}
              valueKey={form.imageKey}
              onChange={({ url, key }) => setForm((prev) => ({ ...prev, imageUrl: url, imageKey: key }))}
              onUploadingChange={setUploadingImage}
            />
          </div>
          <button
            className="w-full min-w-0 max-w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void save()}
            disabled={uploadingImage}
          >
            {form.id ? 'Yangilash' : 'Yaratish'}
          </button>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <div key={item.id} className="min-w-0 max-w-full rounded-xl border border-slate-100 p-3">
              <div className="flex min-w-0 max-w-full items-center gap-2">
                {item.imageThumbUrl || item.imageUrl ? (
                  <img
                    src={item.imageThumbUrl ?? item.imageUrl ?? ''}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-500">No image</div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-slate-500">{item.category?.name ?? "Kategoriya yo'q"}</p>
                </div>
              </div>
              <p className="mt-2 text-sm">{formatMoneyUz(item.price)}</p>
              <p className={`text-xs ${item.stockQuantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {item.stockQuantity > 0 ? `In stock: ${item.stockQuantity}` : 'Out of stock'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" onClick={() => edit(item)}>
                  Edit
                </button>
                <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300" onClick={() => void remove(item.id)}>
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
