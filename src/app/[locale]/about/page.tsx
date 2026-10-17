import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/site/page-header';
import { resolveLocale } from '@/i18n/server';
import { getSiteSettings } from '@/lib/data/settings';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/about'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'about' });
  return pageMetadata({ locale, href: '/about', title: t('title'), description: t('description') });
}

export default async function AboutPage({ params }: PageProps<'/[locale]/about'>) {
  await resolveLocale(params);
  const t = await getTranslations('about');
  const settings = await getSiteSettings();
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader title={t('title')} intro={t('intro', { company: settings.company.legalName })} />
      <div className="space-y-4 text-lg">
        <p>{t('p1')}</p>
        <p>{t('p2')}</p>
      </div>
      <section aria-labelledby="values" className="space-y-4">
        <h2 id="values" className="text-xl font-bold">
          {t('valuesTitle')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(['value1', 'value2', 'value3'] as const).map((key) => (
            <li key={key} className="flex gap-3 rounded-xl border p-4">
              <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
