import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';
import {
  Bell,
  Building2,
  Store,
  ChartLine,
  ClipboardList,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  Logs,
  Package,
  Library,
  Percent,
  Settings,
  ShieldAlert,
  Tags,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: 'Asosiy' | 'Boshqaruv' | 'Monitoring' | 'Tizim';
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, group: 'Asosiy' },
  { href: '/admin/notifications', label: 'Push bildirishnomalar', icon: Bell, group: 'Asosiy' },
  { href: '/admin/businesses', label: 'Businesses', icon: Building2, group: 'Boshqaruv' },
  { href: '/admin/products', label: 'Products', icon: Package, group: 'Boshqaruv' },
  { href: '/admin/global-catalog', label: 'Global katalog', icon: Library, group: 'Boshqaruv' },
  { href: '/admin/stores', label: 'Do‘konlar', icon: Store, group: 'Boshqaruv' },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList, group: 'Boshqaruv' },
  { href: '/admin/cashback-transactions', label: 'Cashback', icon: Gift, group: 'Boshqaruv' },
  { href: '/admin/users', label: 'Users & CRM', icon: Users, group: 'Boshqaruv' },
  { href: '/admin/categories', label: 'Categories', icon: Tags, group: 'Boshqaruv' },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon, group: 'Boshqaruv' },
  { href: '/admin/coupons', label: 'Coupons', icon: Percent, group: 'Boshqaruv' },
  { href: '/admin/uploads', label: 'Upload Jobs', icon: UploadCloud, group: 'Monitoring' },
  { href: '/admin/analytics', label: 'Analytics', icon: ChartLine, group: 'Monitoring' },
  { href: '/admin/logs', label: 'Logs & Errors', icon: Logs, group: 'Monitoring' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, group: 'Tizim' },
];

export const ADMIN_NAV_GROUPS: AdminNavItem['group'][] = ['Asosiy', 'Boshqaruv', 'Monitoring', 'Tizim'];

const MARKETPLACE_ADMIN_HREFS = new Set(['/admin/global-catalog', '/admin/stores']);

function filterMarketplaceNav(items: AdminNavItem[]): AdminNavItem[] {
  if (isMarketplaceEnabled()) return items;
  return items.filter((item) => !MARKETPLACE_ADMIN_HREFS.has(item.href));
}

export function adminNavItemsForRole(actorRole?: string | null): AdminNavItem[] {
  const r = (actorRole ?? '').toUpperCase();
  if (r === 'SUPER_ADMIN' || r === 'ADMIN') {
    return filterMarketplaceNav(ADMIN_NAV_ITEMS);
  }
  return filterMarketplaceNav(ADMIN_NAV_ITEMS.filter((item) => item.href !== '/admin/settings'));
}

export const LOGOUT_ITEM = { href: '/profile', label: 'Logout', icon: ShieldAlert };
