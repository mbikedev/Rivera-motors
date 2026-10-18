import { getTranslations } from 'next-intl/server';
import { ContactDetails } from '@/components/site/contact-details';
import { Link } from '@/i18n/navigation';
import type { SiteSettings } from '@/lib/data/types';
import { LogoMark } from './logo';
import { NAV_ITEMS } from './nav-items';

export async function SiteFooter({ settings, year }: { settings: SiteSettings; year: number }) {
  const t = await getTranslations();
  return (
    <footer className="bg-primary text-primary-foreground mt-16 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-lg font-bold">
            <LogoMark className="size-8" /> {settings.company.name}
          </p>
          <p className="text-primary-foreground/80 text-sm">{t('footer.tagline')}</p>
          <p className="text-primary-foreground/80 text-sm">{t('footer.noOnlineSale')}</p>
        </div>
        <div className="[&_a]:text-primary-foreground [&_.text-accent]:text-orange-300">
          <ContactDetails settings={settings} showHours={false} showDirections={false} />
        </div>
        <nav aria-label={t('nav.mainNavigation')} className="text-sm">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/legal-notice" className="hover:underline">
                {t('footer.legal')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                {t('footer.privacy')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="text-primary-foreground/70 border-t border-white/15 py-4 text-center text-xs">
        {t('footer.rights', { year, company: settings.company.legalName })}
      </div>
    </footer>
  );
}
