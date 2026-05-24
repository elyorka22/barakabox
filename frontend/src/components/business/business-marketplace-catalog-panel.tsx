'use client';

import { useState } from 'react';
import { BusinessImportCatalogPanel } from '@/components/business/business-import-catalog-panel';
import { StoreListingsPanel } from '@/components/business/store-listings-panel';

type Mode = 'import' | 'mine';

export function BusinessMarketplaceCatalogPanel() {
  const [mode, setMode] = useState<Mode>('import');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <section className="space-y-3 border-b border-slate-200 pb-4">
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('import')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
            mode === 'import' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
          }`}
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => setMode('mine')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
            mode === 'mine' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
          }`}
        >
          Mening mahsulotlarim
        </button>
      </div>

      {mode === 'import' ? (
        <BusinessImportCatalogPanel
          key={refreshKey}
          onImported={() => {
            setRefreshKey((k) => k + 1);
            setMode('mine');
          }}
        />
      ) : (
        <StoreListingsPanel />
      )}
    </section>
  );
}
