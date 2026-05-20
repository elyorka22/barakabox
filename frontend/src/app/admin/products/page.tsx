'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import {
  AdminProductFormDrawer,
  type ProductFormState,
  type VariantFormRow,
} from '@/components/admin/products/admin-product-form-drawer';
import { AdminProductsTable } from '@/components/admin/products/admin-products-table';
import {
  type AdminInventoryProduct,
  type SortBy,
  type StatusFilter,
  type StockFilter,
  buildQuickStockPatch,
} from '@/components/admin/products/product-inventory-utils';
import {
  DEFAULT_PRODUCT_UNIT,
  DEFAULT_SELLING_MODE,
  PRODUCT_UNIT_SELECT_OPTIONS,
  type ProductUnitCode,
  type SellingMode,
  fallbackSellingModeFromUnit,
  normalizeIncomingProductUnit,
  normalizeSellingMode,
} from '@onlinebozor/product-units';

type Business = { id: string; displayName: string };
type Category = { id: string; name: string; slug: string };

type ListResponse = {
  items: AdminInventoryProduct[];
  total: number;
  page: number;
  limit: number;
};

const EMPTY_VARIANT: VariantFormRow = {
  id: '',
  flavor: '',
  description: '',
  price: '1000',
  discountPrice: '',
  discountPercent: '',
  stock: '0',
  sku: '',
  imageUrl: '',
};

const defaultForm = (businessId: string, categoryId: string): ProductFormState => ({
  id: '',
  name: '',
  price: '1000',
  unit: DEFAULT_PRODUCT_UNIT,
  sellingMode: DEFAULT_SELLING_MODE,
  businessId,
  categoryId,
  discountEnabled: false,
  discountedPrice: '',
  promotionBadge: '',
  promotionEnabled: false,
  promotionStartAt: '',
  promotionEndAt: '',
  cashbackType: 'NONE',
  cashbackValue: '0',
  variants: [{ ...EMPTY_VARIANT }],
});

export default function AdminProductsPage() {
  const token = authStorage.getAccessToken();

  const [products, setProducts] = useState<AdminInventoryProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(defaultForm('', ''));
  const [unitSearch, setUnitSearch] = useState('');
  const [uploadingVariantImages, setUploadingVariantImages] = useState<Record<number, boolean>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stockBusyId, setStockBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminInventoryProduct | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  const metaLoaded = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, businessFilter, stockFilter, statusFilter, sortBy, pageSize]);

  const loadMeta = useCallback(async () => {
    if (!token) return;
    try {
      const [businessesData, categoriesData] = await Promise.all([
        api.get<Business[]>('/businesses/approved', token),
        api.get<Category[]>('/categories'),
      ]);
      setBusinesses(businessesData);
      const cats = categoriesData.filter((c) => c.slug !== 'all');
      setCategories(cats);
      if (!metaLoaded.current) {
        metaLoaded.current = true;
        setForm(defaultForm(businessesData[0]?.id ?? '', cats[0]?.id ?? ''));
        setBulkCategoryId(cats[0]?.id ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi");
    }
  }, [token]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy,
        stockFilter,
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (categoryFilter !== 'ALL') params.set('categoryId', categoryFilter);
      if (businessFilter !== 'ALL') params.set('businessId', businessFilter);
      if (statusFilter === 'inactive' || statusFilter === 'all') {
        params.set('includeInactive', 'true');
      }
      const res = await api.get<ListResponse>(`/products/admin/list?${params}`, token);
      let items = res.items;
      if (statusFilter === 'active') {
        items = items.filter((p) => p.isActive !== false);
      } else if (statusFilter === 'inactive') {
        items = items.filter((p) => p.isActive === false);
      }
      setProducts(items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo'lmadi");
    } finally {
      setListLoading(false);
      setLoading(false);
    }
  }, [token, page, pageSize, debouncedSearch, categoryFilter, businessFilter, stockFilter, statusFilter, sortBy]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const filteredUnitOptions = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    let list = PRODUCT_UNIT_SELECT_OPTIONS;
    if (q) {
      list = PRODUCT_UNIT_SELECT_OPTIONS.filter(
        (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
      );
    }
    const hasCurrent = list.some((o) => o.value === form.unit);
    if (!hasCurrent) {
      const cur = PRODUCT_UNIT_SELECT_OPTIONS.find((o) => o.value === form.unit);
      if (cur) return [cur, ...list];
    }
    return list;
  }, [unitSearch, form.unit]);

  const openCreate = useCallback(() => {
    setUnitSearch('');
    setForm(defaultForm(businesses[0]?.id ?? '', categories[0]?.id ?? ''));
    setDrawerOpen(true);
  }, [businesses, categories]);

  const openEdit = useCallback((item: AdminInventoryProduct) => {
    setUnitSearch('');
    const editUnit = normalizeIncomingProductUnit(item.unit ?? item.unitType) ?? DEFAULT_PRODUCT_UNIT;
    const editSellingMode: SellingMode =
      normalizeSellingMode(item.sellingMode) ?? fallbackSellingModeFromUnit(editUnit);
    setForm({
      id: item.id,
      name: item.name,
      price: String(item.price ?? 0),
      unit: editUnit,
      sellingMode: editSellingMode,
      businessId: item.businessId,
      categoryId: item.category?.id ?? '',
      discountEnabled: Boolean(item.discountEnabled),
      discountedPrice: item.discountedPrice ? String(item.discountedPrice) : '',
      promotionBadge: (item.promotionBadge as ProductFormState['promotionBadge']) ?? '',
      promotionEnabled: Boolean(item.promotionEnabled),
      promotionStartAt: item.promotionStartAt ? new Date(item.promotionStartAt).toISOString().slice(0, 16) : '',
      promotionEndAt: item.promotionEndAt ? new Date(item.promotionEndAt).toISOString().slice(0, 16) : '',
      cashbackType: (item.cashbackType as ProductFormState['cashbackType']) ?? 'NONE',
      cashbackValue: String(item.cashbackValue ?? 0),
      variants:
        item.variants?.map((variant) => ({
          id: variant.id ?? '',
          flavor: variant.flavor?.trim() || variant.title?.trim() || '',
          description: variant.description ?? '',
          price: String(variant.price ?? 0),
          discountPrice:
            typeof variant.discountPrice === 'number' && variant.discountPrice > 0
              ? String(variant.discountPrice)
              : '',
          discountPercent: '',
          stock: String(variant.stock ?? 0),
          sku: variant.sku ?? '',
          imageUrl: variant.imageUrl ?? '',
        })) ?? [
          {
            ...EMPTY_VARIANT,
            price: String(item.price),
            stock: String(item.stockQuantity),
          },
        ],
    });
    setDrawerOpen(true);
  }, []);

  const handleVariantUploading = useCallback((variantIdx: number, isUploading: boolean) => {
    setUploadingVariantImages((prev) => {
      if (isUploading) return { ...prev, [variantIdx]: true };
      const next = { ...prev };
      delete next[variantIdx];
      return next;
    });
  }, []);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    const rows = form.variants.filter((v) => v.flavor.trim() && Number(v.price) > 0);
    if (rows.length === 0) {
      setError("Kamida bitta variant uchun ta'm nomi va musbat narx kiriting.");
      setSaving(false);
      return;
    }
    if (Number(form.price) <= 0) {
      setError("Asosiy narx musbat bo'lishi kerak.");
      setSaving(false);
      return;
    }
    if (form.discountEnabled) {
      const sale = Number(form.discountedPrice);
      if (!sale || sale <= 0 || sale >= Number(form.price)) {
        setError("Chegirma narxi asosiy narxdan kichik bo'lishi kerak.");
        setSaving(false);
        return;
      }
    }

    const normalizedVariants = rows.map((variant, idx) => ({
      ...(variant.id ? { id: variant.id } : {}),
      title: variant.flavor.trim() || `${form.name.trim()} Variant ${idx + 1}`,
      flavor: variant.flavor.trim() || undefined,
      description: variant.description.trim() || undefined,
      sku: variant.sku.trim() || undefined,
      price: Number(variant.price),
      stock: Number(variant.stock),
      imageUrl: variant.imageUrl.trim() || undefined,
      sortOrder: idx,
      ...(idx === 0 && form.discountEnabled && Number(form.discountedPrice) > 0
        ? { discountPrice: Number(form.discountedPrice) }
        : {}),
    }));

    const first = normalizedVariants[0];
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) > 0 ? Number(form.price) : first.price,
      discountEnabled: form.discountEnabled,
      ...(form.discountEnabled && Number(form.discountedPrice) > 0
        ? { discountedPrice: Number(form.discountedPrice) }
        : {}),
      promotionBadge: form.promotionBadge || undefined,
      promotionEnabled: form.promotionEnabled,
      promotionStartAt: form.promotionEnabled && form.promotionStartAt ? new Date(form.promotionStartAt).toISOString() : undefined,
      promotionEndAt: form.promotionEnabled && form.promotionEndAt ? new Date(form.promotionEndAt).toISOString() : undefined,
      stockQuantity: normalizedVariants.reduce((s, v) => s + v.stock, 0),
      unit: form.unit,
      sellingMode: form.sellingMode,
      cashbackType: form.cashbackType,
      cashbackValue: Math.max(0, Math.floor(Number(form.cashbackValue) || 0)),
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      variants: normalizedVariants,
    };

    try {
      if (form.id) {
        await api.patch(`/products/${form.id}`, payload, token);
        setSuccess('Mahsulot yangilandi');
      } else {
        await api.post('/products', { ...payload, businessId: form.businessId }, token);
        setSuccess('Mahsulot yaratildi');
      }
      setDrawerOpen(false);
      setForm(defaultForm(businesses[0]?.id ?? '', categories[0]?.id ?? ''));
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: AdminInventoryProduct) => {
    if (!token) return;
    setDeletingId(product.id);
    setError('');
    try {
      await api.delete(`/products/${product.id}`, {}, token);
      setSuccess(`“${product.name}” o‘chirildi`);
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirib bo‘lmadi');
      await loadProducts();
    } finally {
      setDeletingId(null);
    }
  };

  const handleStockDelta = useCallback(
    async (product: AdminInventoryProduct, delta: number) => {
      if (!token) return;
      const newTotal = Math.max(0, product.stockQuantity + delta);
      if (newTotal === product.stockQuantity) return;

      setStockBusyId(product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stockQuantity: newTotal } : p)),
      );

      try {
        await api.patch(`/products/${product.id}`, buildQuickStockPatch(product, newTotal), token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Qoldiq yangilanmadi');
        await loadProducts();
      } finally {
        setStockBusyId(null);
      }
    },
    [token, loadProducts],
  );

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(products.map((p) => p.id)));
    },
    [products],
  );

  const bulkDelete = async () => {
    if (!token || selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} ta mahsulot o‘chirilsinmi?`)) return;
    setError('');
    for (const id of selectedIds) {
      try {
        await api.delete(`/products/${id}`, {}, token);
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    setSuccess('Tanlangan mahsulotlar o‘chirildi');
    await loadProducts();
  };

  const bulkCategory = async () => {
    if (!token || selectedIds.size === 0 || !bulkCategoryId) return;
    setError('');
    for (const id of selectedIds) {
      try {
        await api.patch(`/products/${id}`, { categoryId: bulkCategoryId }, token);
      } catch {
        // continue
      }
    }
    setSuccess('Kategoriya yangilandi');
    await loadProducts();
  };

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Ombor / mahsulotlar</h1>
          <p className="text-xs text-slate-500">
            {total} ta · sahifa {page}/{totalPages}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Yangi mahsulot
        </button>
      </div>

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="grid gap-2 lg:grid-cols-12">
          <input
            className="lg:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Qidirish (nomi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="lg:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          >
            <option value="ALL">Biznes</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.displayName}
              </option>
            ))}
          </select>
          <select
            className="lg:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Kategoriya</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="lg:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
            <option value="all">Barchasi</option>
          </select>
          <select
            className="lg:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          >
            <option value="all">Qoldiq: barcha</option>
            <option value="in_stock">Omborda</option>
            <option value="low">Kam (≤5)</option>
            <option value="out">Tugagan</option>
          </select>
          <select
            className="lg:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="newest">Yangi</option>
            <option value="stock_desc">Qoldiq ↓</option>
            <option value="stock_asc">Qoldiq ↑</option>
            <option value="price_desc">Narx ↓</option>
            <option value="price_asc">Narx ↑</option>
          </select>
          <select
            className="lg:col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {selectedIds.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-600">{selectedIds.size} tanlangan</span>
            <select
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
              onClick={() => void bulkCategory()}
            >
              Kategoriyani yangilash
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700"
              onClick={() => void bulkDelete()}
            >
              O‘chirish
            </button>
          </div>
        ) : null}
      </div>

      <AdminProductsTable
        products={products}
        selectedIds={selectedIds}
        stockBusyId={stockBusyId}
        deletingId={deletingId}
        loading={loading || listLoading}
        allSelected={allSelected}
        onToggleAll={handleToggleAll}
        onSelect={handleSelect}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onStockDelta={(p, d) => void handleStockDelta(p, d)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-500">
          {total} ta natija · {pageSize}/sahifa
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Oldingi
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </button>
        </div>
      </div>

      <AdminProductFormDrawer
        open={drawerOpen}
        form={form}
        businesses={businesses}
        categories={categories}
        unitSearch={unitSearch}
        filteredUnitOptions={filteredUnitOptions}
        uploadingVariantImages={uploadingVariantImages}
        saving={saving}
        onClose={() => setDrawerOpen(false)}
        onSave={() => void save()}
        setForm={setForm}
        setUnitSearch={setUnitSearch}
        onVariantUploading={handleVariantUploading}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">O&apos;chirish?</h3>
            <p className="mt-2 text-sm text-slate-600">{deleteTarget.name}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 min-h-10 rounded-lg bg-rose-600 text-sm font-semibold text-white"
                onClick={() => void remove(deleteTarget)}
              >
                O&apos;chirish
              </button>
              <button
                type="button"
                className="flex-1 min-h-10 rounded-lg border border-slate-200 text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
