import { getLocale, getTranslations } from 'next-intl/server';
import { VehicleGallery } from '@/components/gallery/vehicle-gallery';
import { ContactDetails } from '@/components/site/contact-details';
import { Alert } from '@/components/ui/alert';
import type { Locale } from '@/i18n/locales';
import type { SiteSettings, Vehicle } from '@/lib/data/types';
import { computeVehicleAge } from '@/lib/utils/age';
import { formatDate, formatMileage, formatMonthYear, formatNumber, formatPrice, kwToHp } from '@/lib/utils/format';
import { DamageSection } from './damage-section';
import { SpecList, type SpecItem } from './spec-list';
import { StatusBadge } from './status-badge';
import { VisitCta } from './visit-cta';

function triState(value: boolean | null, t: (key: 'yes' | 'no' | 'unknown') => string) {
  if (value === null) return t('unknown');
  return value ? t('yes') : t('no');
}

/**
 * Full vehicle page body. Shared by the public page and the admin preview.
 * `referenceDate` is the explicit date the vehicle age is computed against.
 */
export async function VehicleDetail({
  vehicle,
  settings,
  referenceDate,
}: {
  vehicle: Vehicle;
  settings: SiteSettings;
  referenceDate: Date;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const common = (key: 'yes' | 'no' | 'unknown') => t(`common.${key}`);
  const age = computeVehicleAge(vehicle.firstRegistrationDate, referenceDate);

  const keyFacts: SpecItem[] = [
    { label: t('vehicle.manufactureYear'), value: vehicle.manufactureYear ? String(vehicle.manufactureYear) : null },
    {
      label: t('vehicle.firstRegistration'),
      value: vehicle.firstRegistrationDate ? formatMonthYear(vehicle.firstRegistrationDate, locale) : null,
    },
    {
      label: t('vehicle.age'),
      value: age ? t('vehicle.ageValue', { years: age.years, months: age.months }) : null,
      hint: age
        ? t('vehicle.ageReference', { date: formatDate(referenceDate.toISOString().slice(0, 10), locale) })
        : undefined,
    },
    {
      label: t('vehicle.mileage'),
      value: vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale) : null,
    },
    { label: t('vehicle.starts'), value: triState(vehicle.starts, common) },
    { label: t('vehicle.drivable'), value: triState(vehicle.drivable, common) },
  ];

  const specs: SpecItem[] = [
    { label: t('vehicle.fuel'), value: vehicle.fuelType ? t(`fuel.${vehicle.fuelType}`) : null },
    {
      label: t('vehicle.transmission'),
      value: vehicle.transmission ? t(`transmission.${vehicle.transmission}`) : null,
    },
    { label: t('vehicle.engineCc'), value: vehicle.engineCc ? `${formatNumber(vehicle.engineCc, locale)} cm³` : null },
    {
      label: t('vehicle.power'),
      value: vehicle.powerKw ? t('vehicle.powerValue', { kw: vehicle.powerKw, hp: kwToHp(vehicle.powerKw) }) : null,
    },
    { label: t('vehicle.body'), value: vehicle.bodyType ? t(`body.${vehicle.bodyType}`) : null },
    {
      label: t('vehicle.doorsSeats'),
      value: vehicle.doors || vehicle.seats ? `${vehicle.doors ?? '–'} / ${vehicle.seats ?? '–'}` : null,
    },
    { label: t('vehicle.color'), value: vehicle.color },
    { label: t('vehicle.euroStandard'), value: vehicle.euroStandard },
    {
      label: t('vehicle.co2'),
      value: vehicle.co2EmissionsGKm !== null ? t('vehicle.co2Value', { value: vehicle.co2EmissionsGKm }) : null,
    },
  ];

  const registration: SpecItem[] = [
    { label: t('vehicle.originCountry'), value: vehicle.originCountry },
    { label: t('vehicle.technicalInspection'), value: vehicle.technicalInspection },
    { label: t('vehicle.documents'), value: vehicle.documentsAvailable },
    { label: t('vehicle.serviceHistory'), value: vehicle.serviceHistory },
    { label: t('vehicle.missingParts'), value: vehicle.missingParts },
    {
      label: t('vehicle.damageAssessedAt'),
      value: vehicle.damageAssessedAt ? formatDate(vehicle.damageAssessedAt, locale) : null,
    },
    // The VIN is only shown when it was explicitly released (possibly masked) by an admin.
    ...(vehicle.vinPublic
      ? [{ label: t('vehicle.vin'), value: <span className="font-mono">{vehicle.vinPublic}</span> }]
      : []),
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-10">
        <VehicleGallery media={vehicle.media} title={vehicle.title} />

        {vehicle.fallbackFields.length ? <Alert>{t('detail.translationFallback')}</Alert> : null}

        <section aria-labelledby="key-facts" className="space-y-3">
          <h2 id="key-facts" className="text-xl font-bold">
            {t('detail.keyFacts')}
          </h2>
          <SpecList items={keyFacts} notSpecified={t('common.notSpecified')} />
        </section>

        <DamageSection vehicle={vehicle} />

        <section aria-labelledby="specs" className="space-y-3">
          <h2 id="specs" className="text-xl font-bold">
            {t('detail.specsTitle')}
          </h2>
          <SpecList items={specs} notSpecified={t('common.notSpecified')} />
        </section>

        <section aria-labelledby="registration" className="space-y-3">
          <h2 id="registration" className="text-xl font-bold">
            {t('detail.registrationTitle')}
          </h2>
          <SpecList items={registration} notSpecified={t('common.notSpecified')} />
        </section>

        <Alert variant="warning" title={t('detail.disclaimerTitle')}>
          {t('detail.disclaimerText')}
        </Alert>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-3 rounded-xl border p-5">
          <StatusBadge status={vehicle.status} />
          <p className="text-3xl font-bold">
            {vehicle.askingPriceEur !== null
              ? formatPrice(vehicle.askingPriceEur, locale)
              : t('vehicle.priceOnRequest')}
          </p>
          {vehicle.askingPriceEur !== null ? (
            <p className="text-muted-foreground text-xs">{t('vehicle.priceNote')}</p>
          ) : null}
          {vehicle.status === 'sold' ? <Alert>{t('detail.soldNotice')}</Alert> : null}
          {vehicle.status === 'pending' ? <Alert>{t('detail.pendingNotice')}</Alert> : null}
        </div>
        <VisitCta vehicle={vehicle} settings={settings} />
        <div className="rounded-xl border p-5">
          <ContactDetails settings={settings} />
        </div>
      </aside>
    </div>
  );
}
