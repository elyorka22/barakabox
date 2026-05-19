'use client';

import type { BusinessDashboard } from '@/types/business-dashboard';

type Props = {
  inventory: BusinessDashboard['inventory'];
};

export function BusinessInventoryPanel({ inventory }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
        <h3 className="text-sm font-semibold text-amber-900">Kam qolgan</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-950">
          {inventory.lowStock.length === 0 ? (
            <li className="text-amber-700/80">Hozircha yoʻq</li>
          ) : (
            inventory.lowStock.map((p) => (
              <li key={p.id}>
                {p.name} — {p.stockQuantity}
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-100">
        <h3 className="text-sm font-semibold text-rose-900">Tugagan</h3>
        <ul className="mt-2 space-y-1 text-sm text-rose-950">
          {inventory.outOfStock.length === 0 ? (
            <li className="text-rose-700/80">Hozircha yoʻq</li>
          ) : (
            inventory.outOfStock.map((p) => (
              <li key={p.id}>
                {p.name}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
