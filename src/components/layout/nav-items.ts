import type { AppPathname } from '@/i18n/routing';

export const NAV_ITEMS = [
  { href: '/vehicles', key: 'vehicles' },
  { href: '/visit', key: 'visit' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const satisfies ReadonlyArray<{ href: AppPathname; key: string }>;
