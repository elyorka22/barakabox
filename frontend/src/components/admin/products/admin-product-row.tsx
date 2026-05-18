'use client';

import { memo, useCallback } from 'react';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import { formatMoneyWithUnitSuffix, normalizeIncomingProductUnit } from '@onlinebozor/product-units';
import { AdminProductThumbnail } from './admin-product-thumbnail';
import {
  type AdminInventoryProduct,
  primarySku,
  shortId,
  statusBadgeClass,
  statusLabel,
  stockTone,
  stockToneClass,
} from './product-inventory-utils';

type Props = {
  product: AdminInventoryProduct;
  selected: boolean;
  stockBusy: boolean;
  deleting: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (product: AdminInventoryProduct) => void;
  onDelete: (product: AdminInventoryProduct) => void;
  onStockDelta: (product: AdminInventoryProduct, delta: number) => void;
};

function AdminProductRowInner({
  product,
  selected,
  stockBusy,
  deleting,
  onSelect,
  onEdit,
  onDelete,
  onStockDelta,
}: Props) {
  const unit = normalizeIncomingProductUnit(product.unit ?? product.unitType);
  const tone = stockTone(product.stockQuantity);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSelect(product.id, e.target.checked);
    },
    [onSelect, product.id],
  );

  return (
    <tr
      className={`border-b border-slate-100 transition-colors hover:bg-slate-50/90 ${
        selected ? 'bg-sky-50/50' : ''
      } ${!product.isActive ? 'opacity-70' : ''}`}
    >
      <td className="sticky left-0 z-[1] bg-inherit px-2 py-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={selected}
          onChange={handleSelect}
          aria-label={`Tanlash: ${product.name}`}
        />
      </td>
      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-slate-500" title={product.id}>
        {shortId(product.id)}
      </td>
      <td className="px-2 py-2">
        <AdminProductThumbnail product={product} />
      </td>
      <td className="min-w-[140px] max-w-[220px] px-2 py-2">
        <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
        {!product.isActive ? (
          <span className="text-[10px] font-medium text-slate-500">O&apos;chirilgan</span>
        ) : null}
      </td>
      <td className="hidden whitespace-nowrap px-2 py-2 text-xs text-slate-600 md:table-cell">
        {product.category?.name ?? '—'}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums text-slate-800">
        {formatMoneyWithUnitSuffix(formatMoneyUz(product.price), unit ?? 'dona')}
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={stockBusy || deleting}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
            onClick={() => onStockDelta(product, -1)}
            aria-label="Qoldiqni kamaytirish"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span
            className={`min-w-[2.5rem] rounded px-1.5 py-0.5 text-center text-sm font-semibold tabular-nums ${stockToneClass(tone)}`}
          >
            {product.stockQuantity}
          </span>
          <button
            type="button"
            disabled={stockBusy || deleting}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
            onClick={() => onStockDelta(product, 1)}
            aria-label="Qoldiqni oshirish"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="hidden whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-600 lg:table-cell">
        {primarySku(product)}
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(product)}`}>
          {statusLabel(product)}
        </span>
      </td>
      <td className="sticky right-0 z-[1] bg-inherit px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700"
            onClick={() => onEdit(product)}
            title="Tahrirlash"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-40"
            onClick={() => onDelete(product)}
            title="O&apos;chirish"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export const AdminProductRow = memo(AdminProductRowInner);
