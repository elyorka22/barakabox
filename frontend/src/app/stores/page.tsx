import Link from 'next/link';
import { fetchStoresServer } from '@/lib/marketplace-home';
import { SafeImage } from '@/components/safe-image';
import { MobileNav } from '@/components/app-nav';

export default async function StoresIndexPage() {
  const stores = await fetchStoresServer();

  return (
    <main className="bb-page bg-[#F8F8F8] pb-24">
      <div className="bb-shell px-4 pt-4">
        <h1 className="text-xl font-bold text-[#111827]">Do‘konlar</h1>
        <p className="mt-1 text-sm text-slate-500">Marketplace do‘konlari</p>
        <ul className="mt-4 space-y-2">
          {stores.length === 0 ? (
            <li className="text-sm text-slate-500">Hozircha do‘kon yoʻq</li>
          ) : (
            stores.map((store) => (
              <li key={store.id}>
                <Link
                  href={`/stores/${store.slug}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                    {store.logoUrl ? (
                      <SafeImage
                        src={store.logoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xl">🏪</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">{store.name}</p>
                    {store.minOrderPrice > 0 ? (
                      <p className="text-xs text-slate-500">
                        Min. buyurtma: {(store.minOrderPrice / 100).toLocaleString('uz-UZ')} soʻm
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
      <MobileNav />
    </main>
  );
}
