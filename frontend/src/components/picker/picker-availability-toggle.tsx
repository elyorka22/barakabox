'use client';

import { motion } from 'framer-motion';

type Props = {
  online: boolean;
  onChange: (online: boolean) => void;
};

export function PickerAvailabilityToggle({ online, onChange }: Props) {
  return (
    <motion.section
      layout
      className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Ish holati</p>
          <p className="text-xs text-[#6B7280]">
            {online ? 'Yangi buyurtmalar qabul qilinadi' : 'Faqat boshlangan buyurtmalar'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          onClick={() => onChange(!online)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${online ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${online ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
    </motion.section>
  );
}
