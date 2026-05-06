'use client';

import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/profile', label: 'Profile' },
  { href: '/business', label: 'Business' },
  { href: '/admin', label: 'Admin' },
  { href: '/courier', label: 'Courier' },
];

function getItemClass(pathname: string, href: string, mobile = false) {
  const isActive = pathname === href;
  if (mobile) {
    return isActive ? 'font-semibold text-[#1caf50]' : '';
  }
  return isActive ? 'bb-btn-primary' : 'bb-btn-secondary';
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <div className="bb-desktop-nav mb-4">
      {NAV_ITEMS.map((item) => (
        <a key={item.href} href={item.href} className={getItemClass(pathname, item.href)}>
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="bb-mobile-nav bb-secondary lg:hidden">
      {NAV_ITEMS.slice(0, 4).map((item) => (
        <a key={item.href} href={item.href} className={getItemClass(pathname, item.href, true)}>
          {item.label}
        </a>
      ))}
    </div>
  );
}
