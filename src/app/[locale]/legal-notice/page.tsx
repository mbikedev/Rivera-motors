import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/site/page-header';
import { Alert } from '@/components/ui/alert';
import { resolveLocale } from '@/i18n/server';
import { getSiteSettings } from '@/lib/data/settings';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/legal-notice'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'legal' });
  return pageMetadata({ locale, href: '/legal-notice', title: t('title'), description: t('description') });
}

export default async function LegalNoticePage({ params }: PageProps<'/[locale]/legal-notice'>) {
  await resolveLocale(params);
  const t = await getTranslations('legal');
  const tSite = await getTranslations('site');
  const { company, contact, legal } = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader title={t('title')} />
      {company.isDemo ? <Alert variant="warning">{t('draftNotice')}</Alert> : null}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('providerTitle')}</h2>
        <address className="not-italic">
          {company.legalName}
          <br />
          {contact.street}
          <br />
          {contact.postalCode} {contact.city}
          <br />
          {contact.country}
        </address>
        <p>
          {t('representedBy')}: {legal.managingDirector}
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('contactTitle')}</h2>
        <p>
          {tSite('phone')}: {contact.phoneDisplay}
          <br />
          {tSite('email')}:{' '}
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('registerTitle')}</h2>
        <p>
          {t('registerCourt')}: {legal.registerCourt}
          <br />
          {t('registerNumber')}: {legal.registerNumber}
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('vatTitle')}</h2>
        <p>{legal.vatId}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('responsibleTitle')}</h2>
        <p>{legal.responsibleForContent}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('liabilityTitle')}</h2>
        <p className="text-muted-foreground">{t('liabilityText')}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('disputeTitle')}</h2>
        <p className="text-muted-foreground">{t('disputeText')}</p>
      </section>
    </div>
  );
}
