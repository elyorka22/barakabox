'use client';

import { X } from 'lucide-react';
import { ImageUploader } from '@/components/admin/image-uploader';
import {
  PRODUCT_UNIT_SELECT_OPTIONS,
  type ProductUnitCode,
} from '@onlinebozor/product-units';
import type {
  GlobalCatalogProduct,
  GlobalProductFormState,
  GlobalVariantFormState,
} from '@/types/admin-global-catalog';

type Category = { id: string; name: string };

type Props = {
  open: boolean;
  form: GlobalProductFormState;
  variantForm: GlobalVariantFormState;
  categories: Category[];
  saving: boolean;
  addingVariant: boolean;
  product: GlobalCatalogProduct | null;
  onClose: () => void;
  onSave: () => void;
  onAddVariant: () => void;
  setForm: React.Dispatch<React.SetStateAction<GlobalProductFormState>>;
  setVariantForm: React.Dispatch<React.SetStateAction<GlobalVariantFormState>>;
};

export function AdminGlobalProductFormDrawer({
  open,
  form,
  variantForm,
  categories,
  saving,
  addingVariant,
  product,
  onClose,
  onSave,
  onAddVariant,
  setForm,
  setVariantForm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {form.id ? 'Global mahsulotni tahrirlash' : 'Yangi global mahsulot'}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nomi *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Coca Cola"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Slug (ixtiyoriy)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="Avtomatik yaratiladi"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Brend</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">O‘lchov birligi</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value as ProductUnitCode }))
                }
              >
                {PRODUCT_UNIT_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Kategoriya</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">— Tanlanmagan —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tavsif</label>
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Standart narx (so‘m)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.defaultPrice}
                  onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Standart ombor
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.defaultStock}
                  onChange={(e) => setForm((f) => ({ ...f, defaultStock: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
              />
              Mashhur (bosh sahifada tavsiya)
            </label>

            <ImageUploader
              label="Asosiy rasm"
              valueUrl={form.imageUrl}
              valueKey={form.imageKey}
              storageFolder="products"
              onChange={({ url, key }) =>
                setForm((f) => ({ ...f, imageUrl: url, imageKey: key }))
              }
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Faol (do‘konlar katalogda ko‘radi)
            </label>

            {form.id && product ? (
              <section className="mt-2 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800">Variantlar</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Masalan: hajm → 1L, 1.5L. Do‘konlar har bir variant uchun alohida narx qo‘yadi.
                </p>

                {product.variants.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {product.variants.map((v) => (
                      <li
                        key={v.id}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium">{v.type}:</span> {v.value}
                        {v.sku ? (
                          <span className="ml-2 text-xs text-slate-400">SKU {v.sku}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Variant yoʻq — bitta narxli mahsulot</p>
                )}

                <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-slate-200 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Turi</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        value={variantForm.type}
                        onChange={(e) =>
                          setVariantForm((v) => ({ ...v, type: e.target.value }))
                        }
                        placeholder="hajm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Qiymat</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        value={variantForm.value}
                        onChange={(e) =>
                          setVariantForm((v) => ({ ...v, value: e.target.value }))
                        }
                        placeholder="1L"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">SKU (ixtiyoriy)</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm((v) => ({ ...v, sku: e.target.value }))}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addingVariant}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={() => void onAddVariant()}
                  >
                    {addingVariant ? 'Qo‘shilmoqda…' : 'Variant qo‘shish'}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
            onClick={onClose}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            disabled={saving}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void onSave()}
          >
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
