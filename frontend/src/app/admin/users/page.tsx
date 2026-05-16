'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminUsersCustomers } from '@/components/admin/admin-users-customers';
import { AdminUsersEmployees } from '@/components/admin/admin-users-employees';

type Tab = 'employees' | 'customers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'employees', label: 'Xodimlar' },
  { id: 'customers', label: 'Mijozlar' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = tabParam === 'customers' ? 'customers' : 'employees';
  const [tab, setTab] = useState<Tab>(initialTab);

  const setTabAndUrl = useCallback(
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'employees') {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/users?${qs}` : '/admin/users', { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (tabParam === 'customers') setTab('customers');
    else if (tabParam === 'employees' || !tabParam) setTab('employees');
  }, [tabParam]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <h1 className="text-lg font-semibold text-[#0f172a] md:text-xl">Foydalanuvchilar va mijozlar</h1>
        <p className="mt-1 text-xs text-slate-500 md:text-sm">
          Xodimlarni boshqarish va mijozlar bo‘yicha CRM — buyurtmalar, keshbek va sadoqat segmentlari.
        </p>
        <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                tab === t.id ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setTabAndUrl(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'employees' ? <AdminUsersEmployees /> : <AdminUsersCustomers />}
    </div>
  );
}
