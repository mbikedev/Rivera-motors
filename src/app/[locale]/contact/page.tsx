import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactForm } from '@/components/site/contact-form';
import { ContactDetails } from '@/components/site/contact-details';
import { MapEmbed } from '@/components/site/map-embed';
import { PageHeader } from '@/components/site/page-header';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { getSiteSettings } from '@/lib/data/settings';
import { pageMetadata } from '@/lib/seo';
import { formatAddress } from '@/lib/utils/address';

export async function generateMetadata({ params }: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata({ locale, href: '/contact', title: t('title'), description: t('description') });
}

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  await resolveLocale(params);
  const t = await getTranslations('contact');
  const tFooter = await getTranslations('footer');
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="grid gap-10 lg:grid-cols-2">
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
        {settings.features.contactForm ? (
          <section aria-labelledby="contact-form" className="space-y-4">
            <h2 id="contact-form" className="text-xl font-bold">
              {t('formTitle')}
            </h2>
            <ContactForm
              privacyLink={
                <Link href="/privacy" className="underline">
                  {tFooter('privacy')}
                </Link>
              }
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
