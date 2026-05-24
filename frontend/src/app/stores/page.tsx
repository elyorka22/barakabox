import Link from 'next/link';
import { fetchStoresListServer } from '@/lib/stores-api';
import { parseStoreTypeQuery, STORE_TYPE_CARDS } from '@/lib/store-types';
import { StoreCardLink } from '@/components/stores/store-card';
import { MobileNav } from '@/components/app-nav';

type Props = { searchParams: Promise<{ section?: string; type?: string }> };

const SECTION_LABELS: Record<string, string> = {
  featured: 'Tavsiya etilgan',
  nearby: 'Yaqin atrofda',
  top: 'Eng yaxshi',
  new: 'Yangi',
};

export default async function StoresIndexPage({ searchParams }: Props) {
  const { section, type } = await searchParams;
  const validSection =
    section === 'featured' || section === 'nearby' || section === 'top' || section === 'new'
      ? section
      : undefined;
  const storeType = parseStoreTypeQuery(type);

  const data = await fetchStoresListServer({
    section: validSection,
    type: storeType,
    page: 1,
    limit: 48,
  });

  const typeLabel = storeType
    ? STORE_TYPE_CARDS.find((c) => c.type === storeType)?.label
    : undefined;
  const title = typeLabel ?? (validSection ? SECTION_LABELS[validSection] ?? 'Do‘konlar' : 'Do‘konlar');

  return (
    <main className="bb-page bg-[#F8F8F8] pb-24">
      <div className="bb-shell px-4 pt-4">
        <h1 className="text-xl font-bold text-[#111827]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Marketplace do‘konlari</p>

        <div className="bb-scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
          {(['featured', 'nearby', 'top', 'new'] as const).map((key) => (
            <Link
              key={key}
              href={key === 'featured' ? '/stores?section=featured' : `/stores?section=${key}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                validSection === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {SECTION_LABELS[key]}
            </Link>
          ))}
          <Link
            href="/stores"
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              !validSection ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            Barchasi
          </Link>
        </div>

        <ul className="mt-4 space-y-2">
          {data.items.length === 0 ? (
            <li className="text-sm text-slate-500">Hozircha do‘kon yoʻq</li>
          ) : (
            data.items.map((store) => (
              <li key={store.id}>
                <StoreCardLink store={store} variant="list" />
              </li>
            ))
          )}
        </ul>
      </div>
      <MobileNav />
    </main>
  );
}
