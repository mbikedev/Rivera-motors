import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactDetails } from '@/components/site/contact-details';
import { MapEmbed } from '@/components/site/map-embed';
import { PageHeader } from '@/components/site/page-header';
import { Alert } from '@/components/ui/alert';
import { resolveLocale } from '@/i18n/server';
import { getSiteSettings } from '@/lib/data/settings';
import { pageMetadata } from '@/lib/seo';
import { formatAddress } from '@/lib/utils/address';

export async function generateMetadata({ params }: PageProps<'/[locale]/visit'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'visit' });
  return pageMetadata({ locale, href: '/visit', title: t('title'), description: t('description') });
}

export default async function VisitPage({ params }: PageProps<'/[locale]/visit'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('visit');
  const tSite = await getTranslations('site');
  const settings = await getSiteSettings();
  const parking = settings.visit.parking[locale] ?? settings.visit.parking.de;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-8">
          <ol className="space-y-4">
            {(['step1', 'step2', 'step3', 'step4'] as const).map((key, i) => (
              <li key={key} className="flex gap-4">
                <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-bold">
                  {i + 1}
                </span>
                <p className="pt-1.5">{t(key)}</p>
              </li>
            ))}
          </ol>
          <Alert variant="warning" title={t('safetyTitle')}>
            <span className="inline-flex gap-2">
              <ShieldAlert className="sr-only" aria-hidden />
              {t('safetyText')}
            </span>
          </Alert>
          <section aria-labelledby="bring" className="space-y-2">
            <h2 id="bring" className="text-lg font-semibold">
              {t('bringTitle')}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('bring1')}</li>
              <li>{t('bring2')}</li>
              <li>{t('bring3')}</li>
            </ul>
          </section>
          {parking ? (
            <section aria-labelledby="parking" className="space-y-2">
              <h2 id="parking" className="text-lg font-semibold">
                {tSite('parking')}
              </h2>
              <p>{parking}</p>
            </section>
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border p-5">
            <ContactDetails settings={settings} />
          </div>
          <MapEmbed
            latitude={settings.contact.latitude}
            longitude={settings.contact.longitude}
            label={formatAddress(settings.contact)}
          />
        </div>
      </div>
    </div>
  );
}
