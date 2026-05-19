'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ProductSheetContent } from '@/components/product/product-sheet-content';
import { useProductSheet } from '@/lib/product-sheet-context';

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
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
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
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="flex items-center justify-center pb-1 pt-2">
              <span className="h-1 w-10 rounded-full bg-[#e5e7eb]" aria-hidden />
            </div>
            <button
              type="button"
              onClick={closeProduct}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] transition active:scale-95"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <ProductSheetContent product={product} onAdded={closeProduct} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
