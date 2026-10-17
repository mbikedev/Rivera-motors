import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/site/page-header';
import { Alert } from '@/components/ui/alert';
import { resolveLocale } from '@/i18n/server';
import { getSiteSettings } from '@/lib/data/settings';
import { pageMetadata } from '@/lib/seo';
import { formatAddress } from '@/lib/utils/address';

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return pageMetadata({ locale, href: '/privacy', title: t('title'), description: t('description') });
}

const SECTIONS = ['controller', 'hosting', 'cookies', 'contact', 'map', 'rights'] as const;

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  await resolveLocale(params);
  const t = await getTranslations('privacy');
  const settings = await getSiteSettings();
  const values = {
    company: settings.company.legalName,
    address: formatAddress(settings.contact),
    email: settings.contact.email,
  };
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader title={t('title')} />
      {settings.company.isDemo ? <Alert variant="warning">{t('draftNotice')}</Alert> : null}
      {SECTIONS.map((key) => (
        <section key={key} className="space-y-2">
          <h2 className="text-lg font-semibold">{t(`${key}Title`)}</h2>
          <p className="text-muted-foreground">{t(`${key}Text`, values)}</p>
        </section>
      ))}
    </div>
  );
}
