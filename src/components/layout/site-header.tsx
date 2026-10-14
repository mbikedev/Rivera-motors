import { Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { SiteSettings } from '@/lib/data/types';
import { telHref } from '@/lib/utils/format';
import { LanguageSwitcher } from './language-switcher';
import { LogoMark } from './logo';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

export async function SiteHeader({ settings }: { settings: SiteSettings }) {
  const t = await getTranslations();
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
          aria-label={`${settings.company.name} – ${t('nav.home')}`}
        >
          <LogoMark className="size-9" />
          <span className="text-lg">{settings.company.name}</span>
        </Link>
        <nav aria-label={t('nav.mainNavigation')} className="ml-4 hidden lg:block">
          <NavLinks className="flex items-center gap-1" />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={telHref(settings.contact.phone)}
            className="hover:bg-muted hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium xl:inline-flex"
          >
            <Phone className="size-4" aria-hidden />
            <span className="sr-only">{t('header.call')}: </span>
            {settings.contact.phoneDisplay}
          </a>
          <LanguageSwitcher className="hidden sm:block" />
          <Button asChild variant="accent" className="hidden md:inline-flex">
            <Link href="/visit">{t('header.visitCta')}</Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="md:hidden">
            <a
              href={telHref(settings.contact.phone)}
              aria-label={`${t('header.call')}: ${settings.contact.phoneDisplay}`}
            >
              <Phone aria-hidden />
            </a>
          </Button>
          <MobileNav phone={settings.contact.phone} phoneDisplay={settings.contact.phoneDisplay} />
        </div>
      </div>
    </header>
  );
}
