'use client';

import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactElement;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1caf50]' : 'text-[#6b7280]'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1caf50]' : 'text-[#6b7280]'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    href: '/business',
    label: 'Business',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1caf50]' : 'text-[#6b7280]'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10h18v10H3z" />
        <path d="M7 10V6h10v4" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1caf50]' : 'text-[#6b7280]'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4z" />
      </svg>
    ),
  },
  {
    href: '/courier',
    label: 'Courier',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1caf50]' : 'text-[#6b7280]'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h13v8H3z" />
        <path d="M16 10h3l2 2v3h-5z" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="18.5" cy="17.5" r="1.5" />
      </svg>
    ),
  },
];

function getItemClass(pathname: string, href: string, mobile = false) {
  const isActive = pathname === href;
  if (mobile) {
    return isActive ? 'font-semibold text-[#1caf50]' : '';
  }
  return isActive ? 'bb-btn-primary' : 'bb-btn-secondary';
}

export function DesktopNav() {
  void usePathname();
  return null;
}

export function MobileNav() {
  const pathname = usePathname();
  const mobileItems = NAV_ITEMS.slice(0, 4);

  return (
    <div className="bb-mobile-nav bb-secondary">
      {mobileItems.map((item) => (
        <a key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1 ${getItemClass(pathname, item.href, true)}`}>
          <span>{item.icon(pathname === item.href)}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  );
}
