'use client';

import { Menu, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { AdminNav } from './admin-nav';

/** Sidebar on large screens, slide-in menu on small screens. */
export function AdminShell({ footer, children }: { footer: ReactNode; children: ReactNode }) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  const brand = (
    <div className="flex items-center gap-2 font-semibold">
      <LogoMark className="size-8" />
      {t('title')}
    </div>
  );
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      <aside className="bg-card hidden border-r p-4 lg:flex lg:flex-col lg:gap-6">
        {brand}
        <AdminNav />
        <div className="mt-auto space-y-3">{footer}</div>
      </aside>
      <header className="bg-card flex items-center justify-between border-b px-4 py-3 lg:hidden">
        {brand}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button variant="outline" size="icon" aria-label={t('common.menu')}>
              <Menu aria-hidden />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
            <Dialog.Content className="bg-card fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 overflow-y-auto p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Dialog.Title asChild>{brand}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label={t('common.cancel')}>
                    <X aria-hidden />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">{t('title')}</Dialog.Description>
              <AdminNav onNavigate={() => setOpen(false)} />
              <div className="mt-auto space-y-3">{footer}</div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <main id="main" className="min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
