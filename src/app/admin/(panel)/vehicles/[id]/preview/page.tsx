import { ArrowLeft } from 'lucide-react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { VehicleDetail } from '@/components/vehicles/vehicle-detail';
import { LOCALES, isLocale, type Locale } from '@/i18n/locales';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminVehicleRow } from '@/lib/admin/queries';
import { mapVehicle } from '@/lib/data/mappers';
import { getSiteSettings } from '@/lib/data/settings';
import { cn } from '@/lib/utils/cn';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata() {
  const t = await getTranslations('admin.vehicles');
  return { title: t('preview') };
}

/** Shows the vehicle exactly as the public page renders it, including drafts, in any language. */
export default async function PreviewVehiclePage({ params, searchParams }: PageProps<'/admin/vehicles/[id]/preview'>) {
  const ctx = await requireAdminPage();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const row = await getAdminVehicleRow(ctx, id);
  if (!row) notFound();
  const { lang } = await searchParams;
  const locale: Locale = typeof lang === 'string' && isLocale(lang) ? lang : 'de';

  const t = await getTranslations('admin');
  const ts = await getTranslations('status');
  const tn = await getTranslations('nav.languageNames');
  const settings = await getSiteSettings();
  const vehicle = mapVehicle(row, locale);
  const messages = await getMessages({ locale });
  // Everything rendered below this point (the shared public components) uses the previewed language.
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/vehicles/${id}/edit`}>
            <ArrowLeft aria-hidden /> {t('vehicles.backToEdit')}
          </Link>
        </Button>
        <nav aria-label={t('language')} className="flex gap-1">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/admin/vehicles/${id}/preview?lang=${l}`}
              aria-current={l === locale ? 'true' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm',
                l === locale ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {tn(l)}
            </Link>
          ))}
        </nav>
      </div>
      <Alert variant="warning">{t('vehicles.previewBanner', { status: ts(vehicle.status) })}</Alert>
      <div className="bg-background rounded-xl border p-4 sm:p-6" lang={locale}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <VehicleDetail vehicle={vehicle} settings={settings} referenceDate={new Date()} />
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
