import { LogOut } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminLocaleSwitcher } from '@/components/admin/admin-locale-switcher';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/lib/admin/actions';
import { requireAdminPage } from '@/lib/admin/auth';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdminPage();
  const t = await getTranslations('admin');
  return (
    <AdminShell
      footer={
        <>
          <p className="text-muted-foreground truncate text-xs">
            {t('common.signedInAs', { name: ctx.displayName ?? ctx.email ?? '' })}
          </p>
          <AdminLocaleSwitcher />
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <LogOut aria-hidden />
              {t('nav.logout')}
            </Button>
          </form>
        </>
      }
    >
      {children}
    </AdminShell>
  );
}
