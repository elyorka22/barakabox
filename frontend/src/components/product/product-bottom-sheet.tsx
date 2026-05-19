'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { ProductSheetContent } from '@/components/product/product-sheet-content';
import { useProductSheet } from '@/lib/product-sheet-context';

const CLOSE_DRAG_PX = 72;
const CLOSE_VELOCITY = 380;

export function ProductBottomSheet() {
  const { product, isOpen, closeProduct } = useProductSheet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_DRAG_PX || info.velocity.y > CLOSE_VELOCITY) {
      closeProduct();
    }
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && product ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Yopish"
            onClick={closeProduct}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={onDragEnd}
            className="relative z-10 w-full max-w-lg touch-pan-y overflow-hidden rounded-t-[22px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.1)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 460, damping: 40 }}
          >
            <div className="flex items-center justify-center pb-0.5 pt-2">
              <span className="h-1 w-9 rounded-full bg-[#e5e7eb]" aria-hidden />
            </div>
            <button
              type="button"
              onClick={closeProduct}
              className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#374151] shadow-sm ring-1 ring-black/[0.06] transition active:scale-95"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <ProductSheetContent product={product} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
