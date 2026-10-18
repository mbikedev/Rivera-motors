import { ArrowRight, Camera, MapPin, SearchCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { QuickSearch } from '@/components/filters/quick-search';
import { ContactDetails } from '@/components/site/contact-details';
import { HeroVideo } from '@/components/site/hero-video';
import { MapEmbed } from '@/components/site/map-embed';
import { Button } from '@/components/ui/button';
import { VehicleGrid } from '@/components/vehicles/vehicle-grid';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { getVehicleRepository } from '@/lib/data/repository';
import { getSiteSettings } from '@/lib/data/settings';
import { localizedPath, pageMetadata } from '@/lib/seo';
import { formatAddress } from '@/lib/utils/address';

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'meta' });
  const settings = await getSiteSettings();
  return {
    ...pageMetadata({
      locale,
      href: '/',
      title: t('defaultTitle', { company: settings.company.name }),
      description: t('defaultDescription'),
    }),
    title: { absolute: t('defaultTitle', { company: settings.company.name }) },
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('home');
  const repository = getVehicleRepository();
  const [settings, latest, options] = await Promise.all([
    getSiteSettings(),
    repository.listVehicles({ sort: 'newest', page: 1 }, locale),
    repository.getFilterOptions(),
  ]);
  const newest = latest.items.filter((v) => v.status !== 'sold').slice(0, 8);
  const heroTitle = settings.home.heroTitle[locale] || t('heroTitle');
  const heroSubtitle = settings.home.heroSubtitle[locale] || t('heroSubtitle');
  const catalogPath = localizedPath(locale, '/vehicles');

  const steps = [
    { icon: Camera, title: t('step1Title'), text: t('step1Text') },
    { icon: SearchCheck, title: t('step2Title'), text: t('step2Text') },
    { icon: MapPin, title: t('step3Title'), text: t('step3Text') },
  ];

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:pt-20 lg:pb-28">
          <div>
            <p className="text-sm font-semibold tracking-widest text-orange-300 uppercase">{t('heroEyebrow')}</p>
            <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-bold sm:text-5xl">{heroTitle}</h1>
            <p className="text-primary-foreground/85 mt-5 max-w-2xl text-lg">{heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/vehicles">
                  {t('heroCta')} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/visit">{t('heroSecondary')}</Link>
              </Button>
            </div>
            <p className="text-primary-foreground/70 mt-6 text-sm">{t('noOnlineSale')}</p>
          </div>
          <HeroVideo />
        </div>
      </section>

      <section aria-labelledby="quick-search" className="mx-auto -mt-14 max-w-7xl px-4 sm:px-6">
        <div className="bg-card rounded-2xl border p-5 shadow-lg">
          <h2 id="quick-search" className="mb-3 text-lg font-semibold">
            {t('quickSearchTitle')}
          </h2>
          <QuickSearch action={catalogPath} options={options} />
        </div>
      </section>

      <section aria-labelledby="new-arrivals" className="mx-auto max-w-7xl space-y-6 px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="new-arrivals" className="text-2xl font-bold">
            {t('newArrivals')}
          </h2>
          <Link
            href="/vehicles"
            className="text-accent inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            {t('viewAll')} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {newest.length ? <VehicleGrid vehicles={newest} priorityCount={2} /> : <p>{t('noVehicles')}</p>}
      </section>

      <section aria-labelledby="how-it-works" className="bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 id="how-it-works" className="text-2xl font-bold">
            {t('howItWorksTitle')}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="bg-card rounded-xl p-6 shadow-sm">
                <span className="bg-accent flex size-12 items-center justify-center rounded-full text-white">
                  <step.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">
                  {i + 1}. {step.title}
                </h3>
                <p className="text-muted-foreground mt-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="location" className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 id="location" className="text-2xl font-bold">
            {t('locationTitle')}
          </h2>
          <ContactDetails settings={settings} />
        </div>
        <MapEmbed
          latitude={settings.contact.latitude}
          longitude={settings.contact.longitude}
          label={formatAddress(settings.contact)}
        />
      </section>
    </>
  );
}
