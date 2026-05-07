'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authEvents, authStorage } from '@/lib/api';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const validateAdmin = async () => {
      await authStorage.restoreSession();
      const user = authStorage.getUser();
      const token = authStorage.getAccessToken() || authStorage.getRefreshToken();
      if (!token || (user?.role ?? '').toUpperCase() !== 'ADMIN') {
        router.replace('/profile');
        return;
      }
      setReady(true);
    };
    void validateAdmin();
    const listener = () => {
      void validateAdmin();
    };
    window.addEventListener(authEvents.changedEventName, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(authEvents.changedEventName, listener);
      window.removeEventListener('storage', listener);
    };
  }, [router]);

  if (!ready) return null;

  return <AdminShell>{children}</AdminShell>;
}
