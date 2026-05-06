'use client';

import Link from 'next/link';
import { formatMoneyUz } from '@/lib/format';

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  onAdd: (id: string) => void;
  onIncrease?: (id: string) => void;
  onDecrease?: (id: string) => void;
  quantity?: number;
  loading?: boolean;
  href?: string;
};

export function ProductCard({
  id,
  name,
  price,
  onAdd,
  onIncrease,
  onDecrease,
  quantity = 0,
  loading,
  href,
}: ProductCardProps) {
  return (
    <article className="rounded-3xl bg-white p-3 shadow-sm">
      <Link href={href ?? '#'} className="block">
        <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-[#121212]">{name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-base font-bold text-[#121212]">{formatMoneyUz(price)}</p>
          <span className="text-xs text-gray-500">⭐ 4.8</span>
        </div>
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700">-10%</span>
        {quantity > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] p-1">
            <button
              onClick={() => onDecrease?.(id)}
              disabled={loading}
              className="h-7 w-7 rounded-lg bg-white text-sm font-bold text-gray-700 disabled:opacity-50"
            >
              -
            </button>
            <span className="w-5 text-center text-xs font-semibold text-[#121212]">{quantity}</span>
            <button
              onClick={() => onIncrease?.(id)}
              disabled={loading}
              className="h-7 w-7 rounded-lg bg-[#16A34A] text-sm font-bold text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        ) : (
          <button onClick={() => onAdd(id)} disabled={loading} className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        )}
      </div>
    </article>
  );
}
