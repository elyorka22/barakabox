'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authEvents, authStorage } from '@/lib/api';
import { AdminShell } from '@/components/admin/admin-shell';

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
    <AdminShell>{children}</AdminShell>
  );
}
