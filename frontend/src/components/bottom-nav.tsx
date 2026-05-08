'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, authEvents, authStorage, cartEvents } from '@/lib/api';

const baseItems = [
  { href: '/', key: 'home' },
  { href: '/categories', key: 'categories' },
  { href: '/client', key: 'cart' },
  { href: '/profile', key: 'profile' },
];

function Icon({ iconKey, active }: { iconKey: string; active: boolean }) {
  const className = `h-6 w-6 transition-transform duration-200 ${active ? 'scale-110 text-[#16A34A]' : 'text-slate-400'}`;
  if (iconKey === 'home') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11.25L12 4l9 7.25" />
        <path d="M6.5 10.5V20h11V10.5" />
      </svg>
    );
  }
  if (iconKey === 'categories') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="7" height="7" rx="1.6" />
        <rect x="13" y="4" width="7" height="7" rx="1.6" />
        <rect x="4" y="13" width="7" height="7" rx="1.6" />
        <rect x="13" y="13" width="7" height="7" rx="1.6" />
      </svg>
    );
  }
  if (iconKey === 'cart') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3.5 5.5h2.4l1.8 9h9.4l1.8-6.4H7.2" />
        <circle cx="10" cy="18.5" r="1.3" />
        <circle cx="17" cy="18.5" r="1.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 19.5a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  const items = useMemo(() => baseItems, []);
  const loadCartCount = async () => {
    try {
      const token = authStorage.getAccessToken();
      const payload = await api.get<{ items: Array<{ quantity: number }> }>('/cart', token, true);
      const total = payload.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    void loadCartCount();
    const handleCartChanged = () => void loadCartCount();
    const handleAuthChanged = () => void loadCartCount();
    window.addEventListener(cartEvents.changedEventName, handleCartChanged);
    window.addEventListener(authEvents.changedEventName, handleAuthChanged);
    return () => {
      window.removeEventListener(cartEvents.changedEventName, handleCartChanged);
      window.removeEventListener(authEvents.changedEventName, handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    void loadCartCount();
  }, [pathname]);

  return (
    <nav className="bb-mobile-nav">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center justify-center rounded-2xl py-2 transition-all duration-200 active:scale-95 ${
              active ? 'bg-emerald-50 text-[#16A34A]' : 'text-slate-400'
            }`}
          >
            <Icon iconKey={item.key} active={active} />
            {item.key === 'cart' && cartCount > 0 ? (
              <span className="absolute right-3 top-1 flex min-h-4 min-w-4 animate-[bb-badge-pop_220ms_ease-out] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold leading-none text-white shadow">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
