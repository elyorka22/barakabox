'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">Yetkazib berish manzili</p>
        <h1 className="text-xl font-bold text-[#121212]">Green Valley Point</h1>
      </div>
      <Link href="/profile" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
        <span className="text-lg">👤</span>
      </Link>
    </header>
  );
}
