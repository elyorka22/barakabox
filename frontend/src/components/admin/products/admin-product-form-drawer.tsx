'use client';

import { X } from 'lucide-react';
import { ImageUploader } from '@/components/admin/image-uploader';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_SELECT_OPTIONS,
  type ProductUnitCode,
} from '@onlinebozor/product-units';

export type VariantFormRow = {
  id: string;
  flavor: string;
  description: string;
  price: string;
  discountPrice: string;
  discountPercent: string;
  stock: string;
  sku: string;
  imageUrl: string;
};

export type ProductFormState = {
  id: string;
  name: string;
  unit: ProductUnitCode;
  businessId: string;
  categoryId: string;
  cashbackType: 'NONE' | 'PERCENT' | 'FIXED_AMOUNT';
  cashbackValue: string;
  variants: VariantFormRow[];
};

type Business = { id: string; displayName: string };
type Category = { id: string; name: string };

type Props = {
  open: boolean;
  form: ProductFormState;
  businesses: Business[];
  categories: Category[];
  unitSearch: string;
  filteredUnitOptions: typeof PRODUCT_UNIT_SELECT_OPTIONS;
  uploadingVariantImages: Record<number, boolean>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  setUnitSearch: (v: string) => void;
  onVariantUploading: (idx: number, isUploading: boolean) => void;
};

export function AdminProductFormDrawer({
  open,
  form,
  businesses,
  categories,
  unitSearch,
  filteredUnitOptions,
  uploadingVariantImages,
  saving,
  onClose,
  onSave,
  setForm,
  setUnitSearch,
  onVariantUploading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {form.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
          </h2>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Mahsulot nomi</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">O&apos;lchov birligi</label>
              <input
                className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Qidirish..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as ProductUnitCode }))}
              >
                {filteredUnitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {!form.id ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Do&apos;kon</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.businessId}
                  onChange={(e) => setForm((p) => ({ ...p, businessId: e.target.value }))}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Kategoriya</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Variantlar</p>
              <div className="space-y-2">
                {form.variants.map((variant, idx) => (
                  <div key={`${variant.id || 'n'}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-600">#{idx + 1}</span>
                      <button
                        type="button"
                        className="text-[11px] text-rose-600"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            variants:
                              p.variants.length > 1
                                ? p.variants.filter((_, i) => i !== idx)
                                : p.variants,
                          }))
                        }
                      >
                        Olib tashlash
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        placeholder="Ta'm"
                        value={variant.flavor}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variants: p.variants.map((v, i) =>
                              i === idx ? { ...v, flavor: e.target.value } : v,
                            ),
                          }))
                        }
                      />
                      <input
                        className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        type="number"
                        placeholder="Narx"
                        value={variant.price}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variants: p.variants.map((v, i) =>
                              i === idx ? { ...v, price: e.target.value } : v,
                            ),
                          }))
                        }
                      />
                      <input
                        className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        type="number"
                        placeholder="Qoldiq"
                        value={variant.stock}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variants: p.variants.map((v, i) =>
                              i === idx ? { ...v, stock: e.target.value } : v,
                            ),
                          }))
                        }
                      />
                      <input
                        className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variants: p.variants.map((v, i) =>
                              i === idx ? { ...v, sku: e.target.value } : v,
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
                          setForm((p) => ({
                            ...p,
                            variants: p.variants.map((v, i) =>
                              i === idx ? { ...v, imageUrl: url } : v,
                            ),
                          }))
                        }
                        onUploadingChange={(u) => onVariantUploading(idx, u)}
                        inputId={`drawer-variant-${idx}`}
                        label="Rasm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-600"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      variants: [
                        ...p.variants,
                        {
                          id: '',
                          flavor: '',
                          description: '',
                          price: '1000',
                          discountPrice: '',
                          discountPercent: '',
                          stock: '0',
                          sku: '',
                          imageUrl: '',
                        },
                      ],
                    }))
                  }
                >
                  + Variant
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            disabled={saving || Object.values(uploadingVariantImages).some(Boolean)}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onSave}
          >
            {saving ? 'Saqlanmoqda…' : form.id ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}
