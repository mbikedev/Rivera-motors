'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './nav-items';

export function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  return (
    <ul className={className}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'hover:bg-muted block rounded-md px-3 py-2 text-sm font-medium',
                active ? 'text-accent' : 'text-foreground',
              )}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
