'use client';

import Link from 'next/link';

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  onAdd: (id: string) => void;
  loading?: boolean;
  href?: string;
};

export function ProductCard({ id, name, price, onAdd, loading, href }: ProductCardProps) {
  return (
    <article className="rounded-3xl bg-white p-3 shadow-sm">
      <Link href={href ?? '#'} className="block">
        <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-[#121212]">{name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-base font-bold text-[#121212]">${price}</p>
          <span className="text-xs text-gray-500">⭐ 4.8</span>
        </div>
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700">-10%</span>
        <button onClick={() => onAdd(id)} disabled={loading} className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
    </article>
  );
}
