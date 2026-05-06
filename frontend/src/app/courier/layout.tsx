'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authStorage } from '@/lib/api';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = authStorage.getUser();
    if ((user?.role ?? '').toUpperCase() !== 'COURIER') {
      router.replace('/profile');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#111827]">
        Courier paneli
      </header>
      {children}
    </div>
  );
}
