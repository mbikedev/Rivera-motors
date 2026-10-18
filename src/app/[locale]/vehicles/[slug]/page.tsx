import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BackToCatalog } from '@/components/vehicles/back-to-catalog';
import { VehicleDetail } from '@/components/vehicles/vehicle-detail';
import { VehicleGrid } from '@/components/vehicles/vehicle-grid';
import { VehicleJsonLd } from '@/components/vehicles/vehicle-json-ld';
import { resolveLocale } from '@/i18n/server';
import { getVehicleRepository } from '@/lib/data/repository';
import { getSiteSettings } from '@/lib/data/settings';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo';

export const revalidate = 300;

// Published vehicles are prerendered at build time; new ones are rendered on first request and cached (ISR).
// Admin changes revalidate the affected pages immediately.
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const slugs = await getVehicleRepository().listPublishedSlugs();
  return slugs.map(({ slug }) => ({ locale: params.locale, slug }));
}

async function load(params: PageProps<'/[locale]/vehicles/[slug]'>['params']) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const vehicle = await getVehicleRepository().getVehicleBySlug(slug, locale);
  return { locale, slug, vehicle };
}

export async function generateMetadata({ params }: PageProps<'/[locale]/vehicles/[slug]'>): Promise<Metadata> {
  const { locale, slug, vehicle } = await load(params);
  if (!vehicle) notFound();
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return pageMetadata({
    locale,
    href: { pathname: '/vehicles/[slug]', params: { slug } },
    title: vehicle.text.seoTitle ?? vehicle.title,
    description: vehicle.text.seoDescription ?? vehicle.text.damageSummary ?? t('description'),
    images: vehicle.primaryMedia && !vehicle.primaryMedia.url.endsWith('.svg') ? [vehicle.primaryMedia.url] : undefined,
  });
}

export default async function VehiclePage({ params }: PageProps<'/[locale]/vehicles/[slug]'>) {
  const { locale, slug, vehicle } = await load(params);
  if (!vehicle) notFound();

  const t = await getTranslations('nav');
  const [settings, similar] = await Promise.all([
    getSiteSettings(),
    getVehicleRepository().getSimilarVehicles(vehicle, locale),
  ]);
  const tDetail = await getTranslations('detail');
  const url = absoluteUrl(localizedPath(locale, { pathname: '/vehicles/[slug]', params: { slug } }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <VehicleJsonLd vehicle={vehicle} url={url} sellerName={settings.company.legalName} />
      <nav aria-label={tDetail('breadcrumb')}>
        <BackToCatalog />
        <span className="sr-only">{t('vehicles')}</span>
      </nav>
      <header className="space-y-1">
        <h1
          className="text-2xl font-bold sm:text-3xl"
          lang={vehicle.fallbackFields.includes('title') ? 'de' : undefined}
        >
          {vehicle.title}
        </h1>
        <p className="text-muted-foreground">
          {[vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' · ')}
        </p>
      </header>

      <VehicleDetail vehicle={vehicle} settings={settings} referenceDate={new Date()} />

      {similar.length ? (
        <section aria-labelledby="similar" className="space-y-4 border-t pt-10">
          <h2 id="similar" className="text-2xl font-bold">
            {tDetail('similar')}
          </h2>
          <VehicleGrid vehicles={similar} />
        </section>
      ) : null}
    </div>
  );
}
