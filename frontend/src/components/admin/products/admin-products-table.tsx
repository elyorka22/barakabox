'use client';

import { memo } from 'react';
import { AdminProductRow } from './admin-product-row';
import type { AdminInventoryProduct } from './product-inventory-utils';

type Props = {
  products: AdminInventoryProduct[];
  selectedIds: Set<string>;
  stockBusyId: string | null;
  deletingId: string | null;
  loading: boolean;
  allSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (product: AdminInventoryProduct) => void;
  onDelete: (product: AdminInventoryProduct) => void;
  onStockDelta: (product: AdminInventoryProduct, delta: number) => void;
};

function AdminProductsTableInner({
  products,
  selectedIds,
  stockBusyId,
  deletingId,
  loading,
  allSelected,
  onToggleAll,
  onSelect,
  onEdit,
  onDelete,
  onStockDelta,
}: Props) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="space-y-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex h-11 animate-pulse border-b border-slate-100 bg-slate-50/80" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
        Mahsulot topilmadi
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="bb-scrollbar-hide max-h-[min(70vh,900px)] overflow-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-2 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Barchasini tanlash"
                />
              </th>
              <th className="px-2 py-2.5">ID</th>
              <th className="px-2 py-2.5">Rasm</th>
              <th className="px-2 py-2.5">Nomi</th>
              <th className="hidden px-2 py-2.5 md:table-cell">Kategoriya</th>
              <th className="px-2 py-2.5 text-right">Narx</th>
              <th className="px-2 py-2.5 text-right">Qoldiq</th>
              <th className="hidden px-2 py-2.5 lg:table-cell">SKU</th>
              <th className="px-2 py-2.5">Holat</th>
              <th className="sticky right-0 z-20 bg-slate-50 px-2 py-2.5 text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <AdminProductRow
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                stockBusy={stockBusyId === product.id}
                deleting={deletingId === product.id}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onStockDelta={onStockDelta}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const AdminProductsTable = memo(AdminProductsTableInner);
