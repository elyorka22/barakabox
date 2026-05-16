'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — CRM mijozlar bo‘limi Users ichiga ko‘chirildi. */
export default function AdminCustomersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users?tab=customers');
  }, [router]);

  return (
    <p className="py-8 text-center text-sm text-slate-500">Mijozlar bo‘limiga yo‘naltirilmoqda…</p>
  );
}
