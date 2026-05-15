'use client';

import { motion } from 'framer-motion';

type Props = {
  online: boolean;
  onChange: (online: boolean) => void;
};

export function CourierAvailabilityToggle({ online, onChange }: Props) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        online ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FECACA] bg-[#FEF2F2]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">
            {online ? 'Onlayn — buyurtmalar qabul qilinadi' : 'Oflayn — navbatdan yashirilgansiz'}
          </p>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {online ? 'Yangi tayyor buyurtmalar ko‘rinadi' : 'Faqat sizdagi yo‘ldagi buyurtmalar'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          onClick={() => onChange(!online)}
          className={`relative h-9 w-[52px] shrink-0 rounded-full transition-colors ${
            online ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'
          }`}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow-md"
            style={{ x: online ? 22 : 0 }}
          />
        </button>
      </div>
    </div>
  );
}
