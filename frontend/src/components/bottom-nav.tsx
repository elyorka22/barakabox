'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { api, authEvents, authStorage, cartEvents } from '@/lib/api';

const baseItems = [
  { href: '/', key: 'home', icon: Home, label: 'Bosh' },
  { href: '/categories', key: 'categories', icon: LayoutGrid, label: 'Kategoriya' },
  { href: '/client', key: 'cart', icon: ShoppingCart, label: 'Savat' },
  { href: '/profile', key: 'profile', icon: User, label: 'Profil' },
] as const;

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
            className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 transition-all duration-200 ${
              active ? 'text-[#16C25B]' : 'text-slate-400'
            }`}
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              animate={{ scale: active ? 1.06 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="relative"
            >
              {active ? (
                <motion.span
                  layoutId="nav-active-bg"
                  className="absolute inset-[-8px] rounded-2xl bg-emerald-50 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_6px_14px_rgba(34,197,94,0.2)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <item.icon className={`relative ${active ? 'h-7 w-7' : 'h-6 w-6'}`} strokeWidth={1.9} />
            </motion.div>
            <span className="max-w-[4.5rem] truncate text-[10px] font-medium leading-none sm:text-xs">{item.label}</span>
            {item.key === 'cart' && cartCount > 0 ? (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute right-2 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#16C25B] px-1 text-[9px] font-semibold leading-none text-white shadow sm:right-3 sm:text-[10px]"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </motion.span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
