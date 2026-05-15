'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Unified login lives on /profile — keep route for old bookmarks. */
export default function StaffLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return null;
}
