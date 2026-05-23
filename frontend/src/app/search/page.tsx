import { Suspense } from 'react';
import { SearchPageClient } from '@/components/search/search-page-client';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="bb-page bg-[#F8F8F8] pb-24">
          <div className="bb-shell px-4 py-12 text-center text-sm text-slate-500">Yuklanmoqda…</div>
        </main>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
