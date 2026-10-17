'use client';

import { Menu, Phone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { telHref } from '@/lib/utils/format';
import { LanguageSwitcher } from './language-switcher';
import { NavLinks } from './nav-links';

export function MobileNav({ phone, phoneDisplay }: { phone: string; phoneDisplay: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.openMenu')}>
          <Menu className="size-6!" aria-hidden />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="bg-background fixed inset-y-0 right-0 z-50 flex w-[min(22rem,90vw)] flex-col gap-6 p-5 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{t('nav.menu')}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t('nav.closeMenu')}>
                <X className="size-6!" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{t('nav.mainNavigation')}</Dialog.Description>
          <nav aria-label={t('nav.mainNavigation')}>
            <NavLinks className="flex flex-col gap-1 text-base" onNavigate={() => setOpen(false)} />
          </nav>
          <div className="space-y-3 border-t pt-4">
            <p className="text-muted-foreground text-sm font-medium">{t('nav.language')}</p>
            <LanguageSwitcher />
          </div>
          <div className="mt-auto grid gap-2">
            <Button asChild variant="outline">
              <a href={telHref(phone)}>
                <Phone aria-hidden /> {phoneDisplay}
              </a>
            </Button>
            <Button asChild variant="accent" onClick={() => setOpen(false)}>
              <Link href="/visit">{t('header.visitCta')}</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
