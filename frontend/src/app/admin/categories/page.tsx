'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { showToast } from '@/lib/toast';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  productCount: number;
};

type CategoryListResponse = {
  items: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    imageUrl: '',
    sortOrder: '0',
    isFeatured: true,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = authStorage.getAccessToken();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api', []);

  const load = async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<CategoryListResponse>(
        `/admin/categories?page=${targetPage}&limit=12&search=${encodeURIComponent(search)}`,
        token,
      );
      setCategories(data.items);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategoriyalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page, search, token]);

  const resetForm = () => {
    setForm({ id: '', name: '', imageUrl: '', sortOrder: '0', isFeatured: true, isActive: true });
  };

  const slugPreview = useMemo(() => {
    return form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }, [form.name]);

  const uploadCategoryImage = async (file: File) => {
    if (!token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${apiBase}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Rasmni yuklab bo'lmadi");
      }
      const payload = (await response.json()) as { url: string };
      setForm((prev) => ({ ...prev, imageUrl: payload.url }));
      showToast({ type: 'success', message: 'Kategoriya rasmi yuklandi' });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Rasm yuklashda xatolik",
      });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      showToast({ type: 'error', message: 'Kategoriya nomini kiriting' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder || 0),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      };
      if (form.id) {
        await api.patch(`/admin/categories/${form.id}`, payload, token);
        showToast({ type: 'success', message: 'Kategoriya yangilandi' });
      } else {
        await api.post('/admin/categories', payload, token);
        showToast({ type: 'success', message: 'Kategoriya yaratildi' });
      }
      resetForm();
      setPage(1);
      await load(1);
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Saqlashda xatolik",
      });
    } finally {
      setSaving(false);
    }
  };

  const edit = (category: Category) => {
    setForm({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl ?? '',
      sortOrder: String(category.sortOrder),
      isFeatured: category.isFeatured,
      isActive: category.isActive,
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/admin/categories/${id}`, {}, token);
      showToast({ type: 'success', message: "Kategoriya o'chirildi" });
      await load(page);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : "O'chirishda xatolik" });
    }
  };

  const toggleStatus = async (category: Category) => {
    setCategories((prev) =>
      prev.map((item) => (item.id === category.id ? { ...item, isActive: !item.isActive } : item)),
    );
    try {
      await api.patch(`/admin/categories/${category.id}/status`, { isActive: !category.isActive }, token);
      showToast({ type: 'success', message: "Kategoriya holati yangilandi" });
    } catch (err) {
      setCategories((prev) =>
        prev.map((item) => (item.id === category.id ? { ...item, isActive: category.isActive } : item)),
      );
      showToast({ type: 'error', message: err instanceof Error ? err.message : "Holatni o'zgartirib bo'lmadi" });
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111111]">Kategoriyalar boshqaruvi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategoriya yaratish, tahrirlash, rasm yuklash, featured/active holatini boshqarish.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#111111]">
          {form.id ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
        </h3>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-700">Kategoriya nomi</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Masalan: Sabzavotlar"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <p className="mt-1 truncate text-[11px] text-slate-500">Slug: {slugPreview || '—'}</p>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-700">Sort order</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              type="number"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <div className="mt-3 min-w-0 rounded-2xl border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-700">Kategoriya rasmi</p>
          <p className="mt-0.5 text-[11px] text-slate-500">JPG, PNG yoki WEBP (max 5MB)</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Category preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">No image</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-emerald-700"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    showToast({ type: 'error', message: 'Rasm hajmi 5MB dan oshmasligi kerak' });
                    return;
                  }
                  void uploadCategoryImage(file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                  disabled={!form.imageUrl}
                >
                  Rasmni olib tashlash
                </button>
                {uploading ? <span className="text-xs text-slate-500">Yuklanmoqda...</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void save()}
            disabled={saving || uploading}
          >
            {saving ? 'Saqlanmoqda...' : form.id ? 'Yangilash' : 'Yaratish'}
          </button>
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={resetForm}>
            Bekor qilish
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Kategoriya qidirish..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        {loading ? <div className="bb-skeleton mt-3 h-56 w-full" /> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-slate-100 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">
                    No image
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{category.name}</p>
                  <p className="truncate text-xs text-slate-500">{category.slug}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  Mahsulotlar: {category.productCount}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  Sort: {category.sortOrder}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    category.isFeatured ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {category.isFeatured ? 'Featured' : 'Default'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => edit(category)}
                >
                  Edit
                </button>
                <button
                  className="rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-700"
                  onClick={() => void toggleStatus(category)}
                >
                  {category.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => void remove(category.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Oldingi
          </button>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Keyingi
          </button>
        </div>
      </div>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
