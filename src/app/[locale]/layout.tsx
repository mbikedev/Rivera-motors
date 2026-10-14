import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DemoBanner } from '@/components/layout/demo-banner';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LOCALES } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import { dataSource } from '@/lib/data/repository';
import { getSiteSettings } from '@/lib/data/settings';
import { env } from '@/lib/env';
import { alternatesFor } from '@/lib/seo';

/** Namespaces needed by client components on the public site. */
const CLIENT_NAMESPACES = [
  'common',
  'nav',
  'header',
  'site',
  'catalog',
  'filters',
  'sort',
  'detail',
  'contact',
  'vehicle',
  'status',
  'fuel',
  'transmission',
  'body',
  'damageCategory',
] as const;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#0f2a44',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: t('defaultTitle', { company: settings.company.name }),
      template: t('titleTemplate', { company: settings.company.name }),
    },
    description: t('defaultDescription'),
    applicationName: settings.company.name,
    alternates: alternatesFor(locale, '/'),
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [settings, messages, t] = await Promise.all([
    getSiteSettings(),
    getMessages(),
    getTranslations({ locale, namespace: 'nav' }),
  ]);
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  const showDemo = settings.company.isDemo || dataSource === 'demo';

  return (
    // Browser extensions often add attributes to <html> before React loads; ignore only those.
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          {showDemo ? <DemoBanner showDataSource={dataSource === 'demo'} /> : null}
          <SiteHeader settings={settings} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter settings={settings} year={new Date().getFullYear()} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
