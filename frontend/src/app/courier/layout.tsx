'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authEvents, authStorage } from '@/lib/api';
import { CourierErrorBoundary } from '@/components/courier/courier-error-boundary';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const validate = async () => {
      await authStorage.restoreSession();
      const user = authStorage.getUser();
      if ((user?.role ?? '').toUpperCase() !== 'COURIER') {
        router.replace('/profile');
        return;
      }
      setReady(true);
    };
    void validate();
    const listener = () => void validate();
    window.addEventListener(authEvents.changedEventName, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(authEvents.changedEventName, listener);
      window.removeEventListener('storage', listener);
    };
  }, [router]);

  if (!ready) return null;

  return (
    <CourierErrorBoundary>
      <div className="courier-app min-h-screen">{children}</div>
    </CourierErrorBoundary>
  );
}
