'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { AdminProductCard } from '@/components/admin/admin-product-card';
import { ImageUploader } from '@/components/admin/image-uploader';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_SELECT_OPTIONS,
  type ProductUnitCode,
  formatMoneyWithUnitSuffix,
  normalizeIncomingProductUnit,
} from '@onlinebozor/product-units';

type Product = {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  unit: string;
  /** Legacy API */
  unitType?: string | null;
  businessId: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  imageThumbUrl?: string | null;
  imageCardUrl?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  isActive?: boolean;
  variants?: Array<{
    id?: string;
    title?: string | null;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
  cashbackType?: string | null;
  cashbackValue?: number | null;
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
  const [unitSearch, setUnitSearch] = useState('');
  const [form, setForm] = useState({
    id: '',
    name: '',
    unit: DEFAULT_PRODUCT_UNIT as ProductUnitCode,
    businessId: '',
    categoryId: '',
    cashbackType: 'NONE' as 'NONE' | 'PERCENT' | 'FIXED_AMOUNT',
    cashbackValue: '0',
    variants: [
      { id: '', flavor: '', description: '', price: '1000', discountPrice: '', discountPercent: '', stock: '0', imageUrl: '' },
    ],
  });
  const [uploadingVariantImages, setUploadingVariantImages] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const metaLoaded = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, includeInactive]);

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
        setForm((prev) => ({
          ...prev,
          businessId: prev.businessId || businessesData[0]?.id || '',
          categoryId: prev.categoryId || cats[0]?.id || '',
        }));
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
        limit: '24',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (categoryFilter !== 'ALL') params.set('categoryId', categoryFilter);
      if (includeInactive) params.set('includeInactive', 'true');
      const productsData = await api.get<Product[]>(`/products/admin/list?${params}`, token);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo'lmadi");
    } finally {
      setListLoading(false);
      setLoading(false);
    }
  }, [token, page, debouncedSearch, categoryFilter, includeInactive]);

  const load = useCallback(async () => {
    setLoading(true);
    await loadMeta();
    await loadProducts();
  }, [loadMeta, loadProducts]);

  useEffect(() => {
    if (!token) return;
    void loadMeta();
  }, [token, loadMeta]);

  useEffect(() => {
    if (!token) return;
    void loadProducts();
  }, [token, loadProducts]);

  const visible = products;

  const handleVariantUploading = useCallback((variantIdx: number, isUploading: boolean) => {
    setUploadingVariantImages((prev) => {
      if (isUploading) return { ...prev, [variantIdx]: true };
      const next = { ...prev };
      delete next[variantIdx];
      return next;
    });
  }, []);

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

  const save = async () => {
    setError('');
    const rows = form.variants.filter((v) => v.flavor.trim() && Number(v.price) > 0);
    if (rows.length === 0) {
      setError("Kamida bitta variant uchun ta'm nomi va musbat narx kiriting.");
      return;
    }

    const normalizedVariants = rows.map((variant, idx) => ({
        ...(variant.id ? { id: variant.id } : {}),
        title: variant.flavor?.trim() || `${form.name.trim()} Variant ${idx + 1}`,
        flavor: variant.flavor?.trim() || undefined,
        description: variant.description.trim() || undefined,
        price: Number(variant.price),
        discountPrice: (() => {
          const basePrice = Number(variant.price);
          const salePrice = Number(variant.discountPrice);
          const percent = Number(variant.discountPercent);
          if (Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice) {
            return Math.round(salePrice);
          }
          if (Number.isFinite(percent) && percent > 0 && percent < 100) {
            const calculated = Math.round(basePrice * (1 - percent / 100));
            return calculated > 0 && calculated < basePrice ? calculated : undefined;
          }
          return undefined;
        })(),
        stock: Number(variant.stock),
        imageUrl: variant.imageUrl.trim() || undefined,
        sortOrder: idx,
      }));

    if (normalizedVariants.length === 0) return;

    const firstVariant = normalizedVariants[0];
    if (!firstVariant || firstVariant.price <= 0 || firstVariant.stock < 0) return;

    const aggregatePrice = firstVariant.price;
    const aggregateStock = normalizedVariants.reduce((sum, variant) => sum + variant.stock, 0);

    const basePayload = {
      name: form.name.trim(),
      price: aggregatePrice,
      stockQuantity: aggregateStock,
      unit: form.unit,
      cashbackType: form.cashbackType,
      cashbackValue: Math.max(0, Math.floor(Number(form.cashbackValue) || 0)),
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      variants: normalizedVariants,
    };

    if (!basePayload.name || basePayload.price <= 0) return;

    try {
      if (form.id) {
        // PATCH: whitelist-only DTO — do not send businessId or other non-DTO fields.
        console.debug('[admin products] PATCH', { path: `/products/${form.id}`, body: basePayload });
        await api.patch(`/products/${form.id}`, basePayload, token);
      } else {
        if (!form.businessId) return;
        const createPayload = { ...basePayload, businessId: form.businessId };
        console.debug('[admin products] POST', { path: '/products', body: createPayload });
        await api.post('/products', createPayload, token);
      }
      setForm((prev) => ({
        ...prev,
        id: '',
        name: '',
        unit: DEFAULT_PRODUCT_UNIT,
        cashbackType: 'NONE',
        cashbackValue: '0',
        variants: [{ id: '', flavor: '', description: '', price: '1000', discountPrice: '', discountPercent: '', stock: '0', imageUrl: '' }],
      }));
      setUploadingVariantImages({});
      setSuccess(form.id ? 'Mahsulot yangilandi' : 'Mahsulot yaratildi');
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    }
  };

  const edit = (item: Product) => {
    setUploadingVariantImages({});
    setUnitSearch('');
    setForm({
      id: item.id,
      name: item.name,
      unit: normalizeIncomingProductUnit(item.unit ?? item.unitType) ?? DEFAULT_PRODUCT_UNIT,
      businessId: item.businessId,
      categoryId: item.category?.id ?? '',
      cashbackType: (item.cashbackType as 'NONE' | 'PERCENT' | 'FIXED_AMOUNT') ?? 'NONE',
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
          discountPercent:
            typeof variant.discountPrice === 'number' &&
            variant.discountPrice > 0 &&
            Number(variant.price) > variant.discountPrice
              ? String(Math.round(((Number(variant.price) - Number(variant.discountPrice)) / Number(variant.price)) * 100))
              : '',
          stock: String(variant.stock ?? 0),
          imageUrl: variant.imageUrl ?? '',
        })) ??
        [
          {
            id: '',
            flavor: '',
            description: '',
            price: String(item.price),
            discountPrice: '',
            discountPercent: '',
            stock: String(item.stockQuantity),
            imageUrl: '',
          },
        ],
    });
  };

  const remove = async (product: Product) => {
    if (!token) return;
    setDeletingId(product.id);
    setError('');
    setSuccess('');
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    if (form.id === product.id) {
      setForm({
        id: '',
        name: '',
        unit: DEFAULT_PRODUCT_UNIT,
        businessId: businesses[0]?.id ?? '',
        categoryId: categories[0]?.id ?? '',
        cashbackType: 'NONE',
        cashbackValue: '0',
        variants: [
          { id: '', flavor: '', description: '', price: '1000', discountPrice: '', discountPercent: '', stock: '0', imageUrl: '' },
        ],
      });
    }
    try {
      await api.delete(`/products/${product.id}`, {}, token);
      setSuccess(`“${product.name}” o‘chirildi`);
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirib bo‘lmadi');
      await loadProducts();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {success}
        </p>
      ) : null}

      <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Product management</h2>
        <p className="text-sm text-slate-500">Create/edit/delete, category filter, stock status va pagination.</p>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          O&apos;chirilgan mahsulotlarni ko&apos;rsatish
        </label>
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
          <div className="min-w-0 max-w-full sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-700">O‘lchov birligi</label>
            <input
              className="mb-2 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Qidirish (masalan: kg, dona, quti...)"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
            />
            <select
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.unit}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, unit: e.target.value as ProductUnitCode }))
              }
            >
              {filteredUnitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Faqat ro‘yxatdagi birliklar saqlanadi (standart: dona).</p>
          </div>
          <div className="min-w-0 max-w-full sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-700">Keshbek</label>
            <div className="flex flex-wrap gap-2">
              <select
                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.cashbackType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cashbackType: e.target.value as 'NONE' | 'PERCENT' | 'FIXED_AMOUNT',
                  }))
                }
              >
                <option value="NONE">O‘chiq</option>
                <option value="PERCENT">Foiz</option>
                <option value="FIXED_AMOUNT">Fikslangan summa</option>
              </select>
              <input
                className="w-32 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                type="number"
                min={0}
                placeholder={form.cashbackType === 'PERCENT' ? '%' : 'Summa'}
                value={form.cashbackValue}
                onChange={(e) => setForm((prev) => ({ ...prev, cashbackValue: e.target.value }))}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Foiz: 1–100. Fikslangan: mahsulot qatori bo‘yicha yuqori chegara (xuddi narx birligi bilan).
            </p>
          </div>
          <div className="min-w-0 max-w-full">
            <label className="mb-1 block text-xs font-medium text-slate-700">Do'kon</label>
            <select
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.businessId}
              onChange={(e) => setForm((prev) => ({ ...prev, businessId: e.target.value }))}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.displayName}
                </option>
              ))}
            </select>
          </div>
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
            <p className="mb-2 text-xs font-semibold text-slate-700">Variantlar</p>
            <p className="mb-3 text-[11px] text-slate-500">Har bir variant alohida narx, qoldiq, tavsif va rasmga ega bo'ladi.</p>
            <div className="space-y-3">
              {form.variants.map((variant, idx) => (
                <div key={`${variant.id || 'new'}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Variant #{idx + 1}</p>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      onClick={() => {
                        setUploadingVariantImages((prev) => {
                          const next: Record<number, boolean> = {};
                          Object.entries(prev).forEach(([rawKey, value]) => {
                            const key = Number(rawKey);
                            if (key < idx) next[key] = value;
                            if (key > idx) next[key - 1] = value;
                          });
                          return next;
                        });
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.length > 1 ? prev.variants.filter((_, itemIdx) => itemIdx !== idx) : prev.variants,
                        }));
                      }}
                    >
                      Olib tashlash
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      placeholder="Ta'm nomi (masalan: Cherry)"
                      value={variant.flavor}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, flavor: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      type="number"
                      placeholder="Narx"
                      value={variant.price}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, price: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      type="number"
                      min={0}
                      max={99}
                      placeholder="Chegirma foizi (ixtiyoriy)"
                      value={variant.discountPercent}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) => {
                            if (itemIdx !== idx) return item;
                            return { ...item, discountPercent: e.target.value };
                          }),
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      type="number"
                      placeholder="Aksiya narxi (ixtiyoriy)"
                      value={variant.discountPrice}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, discountPrice: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      type="number"
                      placeholder="Qoldiq"
                      value={variant.stock}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, stock: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Variant tavsifi</label>
                    <textarea
                      className="min-h-[82px] w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      placeholder="Qulupnay tamli tvorog massa"
                      value={variant.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, description: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="mt-2">
                    <ImageUploader
                      valueUrl={variant.imageUrl}
                      valueKey=""
                      onChange={({ url }) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, imageUrl: url } : item,
                          ),
                        }))
                      }
                      onUploadingChange={(isUploading) => handleVariantUploading(idx, isUploading)}
                      inputId={`variant-image-upload-${idx}`}
                      label="Variant rasmi"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    variants: [
                      ...prev.variants,
                      { id: '', flavor: '', description: '', price: '1000', discountPrice: '', discountPercent: '', stock: '0', imageUrl: '' },
                    ],
                  }))
                }
              >
                + Variant qo'shish
              </button>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-6px_16px_rgba(15,23,42,0.06)] backdrop-blur-sm md:static md:z-0 md:mx-0 md:mt-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            <button
              className="flex min-h-11 w-full min-w-0 max-w-full items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void save()}
              disabled={Object.values(uploadingVariantImages).some(Boolean)}
            >
              {form.id ? 'Yangilash' : 'Yaratish'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Mahsulotlar ro&apos;yxati</h3>
        {loading || listLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
            Mahsulot topilmadi
          </p>
        ) : (
          <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <AdminProductCard
                key={item.id}
                item={item}
                deleting={deletingId === item.id}
                onEdit={() => edit(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[#0f172a]">Mahsulotni o&apos;chirish?</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold">{deleteTarget.name}</span> saytdan ham yashiriladi.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                className="flex-1 min-h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void remove(deleteTarget)}
              >
                {deletingId ? 'O‘chirilmoqda…' : 'O‘chirish'}
              </button>
              <button
                type="button"
                className="flex-1 min-h-11 rounded-xl border border-slate-200 text-sm font-medium"
                onClick={() => setDeleteTarget(null)}
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
