'use client';

import { ClipboardList, ExternalLink, LayoutDashboard, Mail, PlusCircle, Settings, Car } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const ITEMS = [
  { href: '/admin', key: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/vehicles', key: 'vehicles', icon: Car, exact: false },
  { href: '/admin/vehicles/new', key: 'newVehicle', icon: PlusCircle, exact: true },
  { href: '/admin/messages', key: 'messages', icon: Mail, exact: false },
  { href: '/admin/settings', key: 'settings', icon: Settings, exact: false },
  { href: '/admin/audit', key: 'audit', icon: ClipboardList, exact: false },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || (pathname.startsWith(`${href}/`) && !pathname.endsWith('/new'));
  return (
    <nav aria-label={t('dashboard')} className="flex flex-col gap-1">
      {ITEMS.map(({ href, key, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
              active && 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="text-muted-foreground hover:bg-muted mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm"
      >
        <ExternalLink className="size-4" aria-hidden />
        {t('viewSite')}
      </a>
    </nav>
  );
}
