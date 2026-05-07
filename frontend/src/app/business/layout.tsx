'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authEvents, authStorage } from '@/lib/api';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const validate = async () => {
      await authStorage.restoreSession();
      const user = authStorage.getUser();
      if ((user?.role ?? '').toUpperCase() !== 'BUSINESS') {
        router.replace('/profile');
        return;
      }
      setReady(true);
    };
    void validate();
    const listener = () => {
      void validate();
    };
    window.addEventListener(authEvents.changedEventName, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(authEvents.changedEventName, listener);
      window.removeEventListener('storage', listener);
    };
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#111827]">
        Business paneli
      </header>
      {children}
    </div>
  );
}
