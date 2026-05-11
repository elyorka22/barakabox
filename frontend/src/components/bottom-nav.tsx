'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { api, authEvents, authStorage, cartEvents } from '@/lib/api';

const baseItems = [
  { href: '/', key: 'home', icon: Home },
  { href: '/categories', key: 'categories', icon: LayoutGrid },
  { href: '/client', key: 'cart', icon: ShoppingCart },
  { href: '/profile', key: 'profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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

  useEffect(() => {
    for (const item of items) {
      if (item.href !== pathname) {
        router.prefetch(item.href);
      }
    }
  }, [items, pathname, router]);

  return (
    <nav className="bb-mobile-nav">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            onClick={() => {
              try {
                sessionStorage.setItem(`bb:scroll:${pathname}`, String(window.scrollY));
              } catch {
                // Ignore storage issues on restricted browsers.
              }
            }}
            className={`relative flex min-h-12 items-center justify-center bg-transparent px-1 py-2 shadow-none transition-[color,transform] duration-200 ease-out active:scale-[0.96] ${
              active ? 'text-[#22C55E]' : 'text-[#98A2B3]'
            }`}
          >
            <span className="relative flex items-center justify-center">
              <item.icon className="relative h-6 w-6 shrink-0" strokeWidth={1.85} />
            </span>
            {item.key === 'cart' && cartCount > 0 ? (
              <span className="absolute right-2 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#22C55E] px-1 text-[9px] font-semibold leading-none text-white shadow-none sm:right-3 sm:text-[10px]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
