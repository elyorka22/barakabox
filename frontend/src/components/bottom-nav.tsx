'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { authStorage } from '@/lib/api';

const clientItems = [
  { href: '/', label: 'Bosh sahifa' },
  { href: '/client', label: 'Savat' },
  { href: '/profile', label: 'Profil' },
];

function Icon({ label, active }: { label: string; active: boolean }) {
  const className = `h-5 w-5 ${active ? 'text-[#16A34A]' : 'text-gray-500'}`;
  if (label === 'Bosh sahifa') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    );
  }
  if (label === 'Savat') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h2l2 10h9l2-7H7" />
        <circle cx="10" cy="19" r="1.4" />
        <circle cx="17" cy="19" r="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState('CLIENT');

  useEffect(() => {
    const user = authStorage.getUser();
    setRole((user?.role ?? 'CLIENT').toUpperCase());
  }, []);

  const items = useMemo(() => {
    if (role === 'ADMIN') return [{ href: '/admin', label: 'Admin' }];
    if (role === 'PICKER') return [{ href: '/picker', label: 'Picker' }];
    if (role === 'COURIER') return [{ href: '/courier', label: 'Courier' }];
    if (role === 'BUSINESS') return [{ href: '/business', label: 'Business' }];
    return clientItems;
  }, [role]);

  return (
    <nav className="bb-mobile-nav">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 text-xs ${active ? 'font-semibold text-[#16A34A]' : 'text-gray-500'}`}>
            <Icon label={item.label} active={active} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
