'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingBag } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { incrementCart } from '@/lib/cart-store';
import type { LastOrderSnapshot } from '@/lib/last-order-storage';

type Props = {
  order: LastOrderSnapshot | null;
};

export function ProfileReorderSection({ order }: Props) {
  const [busy, setBusy] = useState(false);

  const lines = order?.items.filter((l) => l.title) ?? [];
  const preview = lines.slice(0, 4);

  const reorderAll = () => {
    if (!lines.length) return;
    let added = 0;
    for (const line of lines) {
      if (line.variantId && line.productId) {
        incrementCart(line.variantId, line.productId, line.quantity);
        added += 1;
      }
    }
    if (added === 0) {
      showToast({
        type: 'info',
        message: "Bu buyurtma uchun variant bog‘lanishi topilmadi. Katalogdan tanlang.",
      });
      return;
    }
    showToast({ type: 'success', message: `Savatga ${added} pozitsiya qo‘shildi` });
  };

  if (!order || preview.length === 0) {
    return (
      <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#ECECEC] bg-[#FAFAFA]">
            <ShoppingBag className="h-4 w-4 text-[#9CA3AF]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#111827]">Qayta buyurtma</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
              Birinchi buyurtmadan keyin mahsulotlarni bir tugma bilan qayta savatga qo‘shishingiz mumkin.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Qayta buyurtma</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">Oxirgi buyurtmadagi mahsulotlar</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {preview.map((line, idx) => (
          <motion.div
            key={`${line.title}-${idx}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: idx * 0.03 }}
            className="flex min-w-[120px] flex-col rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-3 py-2"
          >
            <p className="line-clamp-2 text-[12px] font-medium leading-snug text-[#111827]">{line.title}</p>
            <p className="mt-1 text-[11px] text-[#6B7280]">×{line.quantity}</p>
          </motion.div>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          try {
            reorderAll();
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white transition active:opacity-90 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {busy ? 'Qo‘shilmoqda...' : 'Barchasini savatga qayta qo‘shish'}
      </button>
    </section>
  );
}
