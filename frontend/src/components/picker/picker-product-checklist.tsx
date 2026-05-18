'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, PackageX } from 'lucide-react';
import { normalizeAssetUrl } from '@/lib/asset-url';
import {
  formatOrderItemQuantity,
  normalizeIncomingProductUnit,
  normalizeSellingMode,
  DEFAULT_PRODUCT_UNIT,
} from '@onlinebozor/product-units';
import type { PickerOrderItem } from '@/lib/picker-types';
import { itemImageUrl } from '@/lib/picker-order-utils';

type Props = {
  items: PickerOrderItem[];
  checkedIds: string[];
  notFoundIds: string[];
  onToggle: (itemId: string) => void;
  onNotFound: (itemId: string) => void;
};

export function PickerProductChecklist({ items, checkedIds, notFoundIds, onToggle, onNotFound }: Props) {
  const done = checkedIds.length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs font-medium text-[#6B7280]">
          <span>Yig‘ish jarayoni</span>
          <span>{done}/{total}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
          <motion.div
            className="h-full rounded-full bg-[#16A34A]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120 }}
          />
        </div>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const checked = checkedIds.includes(item.id);
          const missing = notFoundIds.includes(item.id);
          const img = itemImageUrl(item);
          const unit = normalizeIncomingProductUnit(item.unitType) ?? DEFAULT_PRODUCT_UNIT;
          const sellingMode = normalizeSellingMode(item.sellingMode) ?? undefined;
          return (
            <li
              key={item.id}
              className={`rounded-xl border p-3 ${missing ? 'border-rose-200 bg-rose-50' : checked ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'}`}
            >
              <div className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeAssetUrl(img)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🥬</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug text-[#111827]">{item.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#6B7280]">
                    {formatOrderItemQuantity(item.quantity, unit, sellingMode)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onToggle(item.id)}
                      className={`flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-semibold ${checked ? 'bg-[#16A34A] text-white' : 'border border-[#ECECEC] bg-white'}`}
                    >
                      <AnimatePresence mode="wait">
                        {checked ? (
                          <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Topildi
                          </motion.span>
                        ) : (
                          <motion.span key="u">Belgilash</motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNotFound(item.id)}
                      className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700"
                    >
                      <PackageX className="h-3.5 w-3.5" />
                      Yo‘q
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
