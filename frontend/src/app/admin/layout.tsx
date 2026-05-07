'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authEvents, authStorage } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const validateAdmin = () => {
      const user = authStorage.getUser();
      const token = authStorage.getAccessToken();
      if (!token || (user?.role ?? '').toUpperCase() !== 'ADMIN') {
        router.replace('/profile');
      }
    };
    validateAdmin();
    window.addEventListener(authEvents.changedEventName, validateAdmin);
    window.addEventListener('storage', validateAdmin);
    return () => {
      window.removeEventListener(authEvents.changedEventName, validateAdmin);
      window.removeEventListener('storage', validateAdmin);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#111827]">
        <div className="flex items-center justify-between">
          <span>Admin boshqaruv paneli</span>
          <div className="flex gap-2 text-xs">
            <Link href="/admin" className="rounded-lg bg-gray-100 px-2 py-1">Dashboard</Link>
            <Link href="/admin/uploads" className="rounded-lg bg-gray-100 px-2 py-1">Upload jobs</Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
