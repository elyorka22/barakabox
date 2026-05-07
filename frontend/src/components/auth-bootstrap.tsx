'use client';

import { useEffect } from 'react';
import { authStorage } from '@/lib/api';

export function AuthBootstrap() {
  useEffect(() => {
    void authStorage.restoreSession();
  }, []);

  return null;
}
