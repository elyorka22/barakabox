'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import { resolveProductImageUrl } from '@/lib/product-image';
import {
  DEFAULT_PRODUCT_UNIT,
  formatMoneyWithUnitSuffix,
  normalizeIncomingProductUnit,
  type ProductUnitCode,
} from '@onlinebozor/product-units';

export type AdminProductListItem = {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  unit: string;
  unitType?: string | null;
  isActive?: boolean;
  category?: { id: string; name: string } | null;
  imageThumbUrl?: string | null;
  imageCardUrl?: string | null;
  imageUrl?: string | null;
  variants?: Array<{ imageUrl?: string | null }> | null;
};

type Props = {
  item: AdminProductListItem;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function AdminProductCard({ item, deleting, onEdit, onDelete }: Props) {
  const imageSrc = resolveProductImageUrl(item);
  const unit = normalizeIncomingProductUnit(item.unit ?? item.unitType) ?? DEFAULT_PRODUCT_UNIT;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {imageSrc ? (
          <SafeImage
            src={imageSrc}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            fallbackClassName="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
            Rasm yo&apos;q
          </div>
        )}
        {!item.isActive ? (
          <span className="absolute left-2 top-2 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-white">
            O&apos;chirilgan
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold text-[#0f172a]">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{item.category?.name ?? "Kategoriya yo'q"}</p>
        <p className="mt-2 text-sm font-semibold text-slate-800">
          {formatMoneyWithUnitSuffix(formatMoneyUz(item.price), unit)}
        </p>
        <p className={`mt-0.5 text-xs ${item.stockQuantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {item.stockQuantity > 0 ? `Qoldiq: ${item.stockQuantity}` : 'Tugagan'}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Tahrirlash
          </button>
          <button
            type="button"
            disabled={deleting}
            className="flex min-h-10 min-w-[44px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            onClick={onDelete}
            aria-label="O‘chirish"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
