'use client';

import { memo } from 'react';
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
import {
  itemImageUrl,
  pickerItemProductName,
  pickerItemSubtitle,
  pickerItemVerificationCode,
} from '@/lib/picker-order-utils';

type Props = {
  items: PickerOrderItem[];
  checkedIds: string[];
  notFoundIds: string[];
  onToggle: (itemId: string) => void;
  onNotFound: (itemId: string) => void;
};

const PickerChecklistRow = memo(function PickerChecklistRow({
  item,
  checked,
  missing,
  onToggle,
  onNotFound,
}: {
  item: PickerOrderItem;
  checked: boolean;
  missing: boolean;
  onToggle: (itemId: string) => void;
  onNotFound: (itemId: string) => void;
}) {
  const img = itemImageUrl(item);
  const unit = normalizeIncomingProductUnit(item.unitType) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = normalizeSellingMode(item.sellingMode) ?? undefined;
  const productName = pickerItemProductName(item);
  const subtitle = pickerItemSubtitle(item);
  const verification = pickerItemVerificationCode(item);

  return (
    <li
      className={`rounded-xl border p-3 ${missing ? 'border-rose-200 bg-rose-50' : checked ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'}`}
    >
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizeAssetUrl(img)}
              alt=""
              className="h-full w-full object-contain p-0.5"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg">🥬</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-[#111827]">{productName}</p>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#6B7280]">{subtitle}</p>
          ) : null}
          <p className="mt-1 text-xs font-semibold tabular-nums text-[#374151]">
            {formatOrderItemQuantity(item.quantity, unit, sellingMode)}
          </p>
          {verification ? (
            <p className="mt-0.5 font-mono text-[10px] font-medium tracking-wide text-[#9CA3AF]">
              {verification}
            </p>
          ) : null}
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
});

export function PickerProductChecklist({ items, checkedIds, notFoundIds, onToggle, onNotFound }: Props) {
  const done = checkedIds.length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs font-medium text-[#6B7280]">
          <span>Yig‘ish jarayoni</span>
          <span>
            {done}/{total}
          </span>
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
        {items.map((item) => (
          <PickerChecklistRow
            key={item.id}
            item={item}
            checked={checkedIds.includes(item.id)}
            missing={notFoundIds.includes(item.id)}
            onToggle={onToggle}
            onNotFound={onNotFound}
          />
        ))}
      </ul>
    </div>
  );
}
