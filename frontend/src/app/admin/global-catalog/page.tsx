'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { normalizeAssetUrl } from '@/lib/asset-url';
import { AdminGlobalProductFormDrawer } from '@/components/admin/global-catalog/admin-global-product-form-drawer';
import { DEFAULT_PRODUCT_UNIT } from '@onlinebozor/product-units';
import type {
  GlobalCatalogListResponse,
  GlobalCatalogProduct,
  GlobalProductFormState,
  GlobalVariantFormState,
} from '@/types/admin-global-catalog';

type Category = { id: string; name: string; slug: string };

const EMPTY_FORM: GlobalProductFormState = {
  id: '',
  name: '',
  slug: '',
  description: '',
  brand: '',
  categoryId: '',
  unit: DEFAULT_PRODUCT_UNIT,
  imageUrl: '',
  imageKey: '',
  isActive: true,
};

const EMPTY_VARIANT: GlobalVariantFormState = {
  type: 'hajm',
  value: '',
  sku: '',
  imageUrl: '',
  imageKey: '',
};

export default function AdminGlobalCatalogPage() {
  const token = authStorage.getAccessToken();

  const [items, setItems] = useState<GlobalCatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<GlobalProductFormState>(EMPTY_FORM);
  const [variantForm, setVariantForm] = useState<GlobalVariantFormState>(EMPTY_VARIANT);
  const [editingProduct, setEditingProduct] = useState<GlobalCatalogProduct | null>(null);

  const limit = 24;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, includeInactive]);

  const loadCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ items: Category[] }>(
        '/admin/categories?page=1&limit=200',
        token,
      );
      setCategories(res.items ?? []);
    } catch {
      setCategories([]);
    }
  }, [token]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      if (includeInactive) params.set('includeInactive', '1');

      const res = await api.get<GlobalCatalogListResponse>(
        `/admin/marketplace/global-products?${params}`,
        token,
      );
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, categoryFilter, includeInactive]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setVariantForm({ ...EMPTY_VARIANT });
    setDrawerOpen(true);
  };

  const openEdit = (row: GlobalCatalogProduct) => {
    setEditingProduct(row);
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      brand: row.brand ?? '',
      categoryId: row.categoryId ?? '',
      unit: row.unit || DEFAULT_PRODUCT_UNIT,
      imageUrl: row.imageUrl ?? '',
      imageKey: '',
      isActive: row.isActive,
    });
    setVariantForm({ ...EMPTY_VARIANT });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  const saveProduct = async () => {
    if (!token) return;
    const name = form.name.trim();
    if (name.length < 2) {
      setError('Nom kamida 2 belgidan iborat bo‘lishi kerak');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, unknown> = {
        name,
        description: form.description.trim() || undefined,
        brand: form.brand.trim() || undefined,
        categoryId: form.categoryId || undefined,
        unit: form.unit || DEFAULT_PRODUCT_UNIT,
        isActive: form.isActive,
      };
      const slug = form.slug.trim();
      if (slug) body.slug = slug;
      const imageUrl = form.imageUrl.trim();
      if (imageUrl) body.imageUrl = imageUrl;

      let saved: GlobalCatalogProduct;
      if (form.id) {
        saved = await api.patch<GlobalCatalogProduct>(
          `/admin/marketplace/global-products/${form.id}`,
          body,
          token,
        );
        setSuccess('Global mahsulot yangilandi');
      } else {
        saved = await api.post<GlobalCatalogProduct>(
          '/admin/marketplace/global-products',
          body,
          token,
        );
        setSuccess('Global mahsulot yaratildi');
      }
      setEditingProduct(saved);
      setForm((f) => ({ ...f, id: saved.id, slug: saved.slug }));
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  const addVariant = async () => {
    const productId = form.id || editingProduct?.id;
    if (!token || !productId) {
      setError('Avval mahsulotni saqlang, keyin variant qo‘shing');
      return;
    }
    const type = variantForm.type.trim();
    const value = variantForm.value.trim();
    if (!type || !value) {
      setError('Variant turi va qiymati kerak');
      return;
    }

    setAddingVariant(true);
    setError('');
    try {
      await api.post(
        `/admin/marketplace/global-products/${productId}/variants`,
        {
          type,
          value,
          sku: variantForm.sku.trim() || undefined,
          imageUrl: variantForm.imageUrl.trim() || undefined,
        },
        token,
      );
      setVariantForm({ ...EMPTY_VARIANT });
      setSuccess('Variant qo‘shildi');
      const listRes = await api.get<GlobalCatalogListResponse>(
        `/admin/marketplace/global-products?page=1&limit=100&includeInactive=1`,
        token,
      );
      const refreshed = listRes.items.find((p) => p.id === productId);
      if (refreshed) setEditingProduct(refreshed);
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Variant qo‘shilmadi');
    } finally {
      setAddingVariant(false);
    }
  };

  const toggleActive = async (row: GlobalCatalogProduct) => {
    if (!token) return;
    try {
      await api.patch(
        `/admin/marketplace/global-products/${row.id}`,
        { isActive: !row.isActive },
        token,
      );
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yangilanmadi');
    }
  };

  const statsLabel = useMemo(() => `${total} ta mahsulot`, [total]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Global katalog</h1>
          <p className="text-sm text-slate-500">
            Platforma mahsulotlari — do‘konlar faqat narx va ombor qo‘shadi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yangi global mahsulot
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm sm:min-w-[200px]"
          placeholder="Qidiruv (nom, brend, slug)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Barcha kategoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Nofaollarni ham ko‘rsatish
        </label>
      </div>

      <p className="text-xs text-slate-500">{statsLabel}</p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Mahsulot topilmadi. «Yangi global mahsulot» tugmasini bosing.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                <th className="px-3 py-2.5 font-medium">Rasm</th>
                <th className="px-3 py-2.5 font-medium">Nomi</th>
                <th className="px-3 py-2.5 font-medium">Kategoriya</th>
                <th className="px-3 py-2.5 font-medium">Variantlar</th>
                <th className="px-3 py-2.5 font-medium">Holat</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2">
                    {row.imageThumbUrl || row.imageUrl ? (
                      <img
                        src={normalizeAssetUrl(row.imageThumbUrl || row.imageUrl || '')}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    {row.brand ? (
                      <p className="text-xs text-slate-500">{row.brand}</p>
                    ) : null}
                    <p className="text-[10px] text-slate-400">{row.slug}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.category?.name ?? '—'}
                    <span className="ml-1 text-xs text-slate-400">/ {row.unit}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.variants.length > 0
                      ? row.variants.map((v) => `${v.value}`).join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(row)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.isActive ? 'Faol' : 'O‘chiq'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-sm font-semibold text-emerald-700"
                      onClick={() => openEdit(row)}
                    >
                      Tahrirlash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Oldingi
          </button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </button>
        </div>
      ) : null}

      <AdminGlobalProductFormDrawer
        open={drawerOpen}
        form={form}
        variantForm={variantForm}
        categories={categories}
        saving={saving}
        addingVariant={addingVariant}
        product={editingProduct}
        onClose={closeDrawer}
        onSave={saveProduct}
        onAddVariant={addVariant}
        setForm={setForm}
        setVariantForm={setVariantForm}
      />
    </div>
  );
}
