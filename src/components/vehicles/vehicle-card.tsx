import { Calendar, Fuel, Gauge } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/locales';
import type { VehicleSummary } from '@/lib/data/types';
import { formatMileage, formatPrice } from '@/lib/utils/format';
import { StatusBadge } from './status-badge';
import { VehicleImage } from './vehicle-image';

/**
 * Catalogue card. The whole card – photo included – is one link to the full vehicle page.
 */
export function VehicleCard({ vehicle, priority = false }: { vehicle: VehicleSummary; priority?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notSpecified = t('common.notSpecified');

  return (
    <article className="group bg-card focus-within:ring-ring relative flex h-full flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow focus-within:ring-2 hover:shadow-md">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        <VehicleImage
          src={vehicle.primaryMedia?.url ?? null}
          alt={vehicle.primaryMedia?.altText ?? vehicle.title}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
          fallbackLabel={t('vehicle.noPhoto')}
        />
        <StatusBadge status={vehicle.status} className="absolute top-3 left-3 shadow" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-base leading-snug font-semibold">
          <Link
            href={{ pathname: '/vehicles/[slug]', params: { slug: vehicle.slug } }}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
          >
            {vehicle.make} {vehicle.model}
            {vehicle.variant ? (
              <span className="text-muted-foreground block text-sm font-normal">{vehicle.variant}</span>
            ) : null}
          </Link>
        </h3>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden />
            <span className="sr-only">{t('vehicle.manufactureYear')}: </span>
            {vehicle.manufactureYear ?? notSpecified}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Gauge className="size-4" aria-hidden />
            <span className="sr-only">{t('vehicle.mileage')}: </span>
            {vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale) : notSpecified}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Fuel className="size-4" aria-hidden />
            <span className="sr-only">{t('vehicle.fuel')}: </span>
            {vehicle.fuelType ? t(`fuel.${vehicle.fuelType}`) : notSpecified}
          </li>
        </ul>
        {vehicle.damageCategories.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('vehicle.damageType')}>
            {vehicle.damageCategories.map((c) => (
              <li key={c}>
                <Badge variant="damage">{t(`damageCategory.${c}`)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-auto pt-1 text-lg font-bold">
          <span className="sr-only">{t('vehicle.price')}: </span>
          {vehicle.askingPriceEur !== null ? formatPrice(vehicle.askingPriceEur, locale) : t('vehicle.priceOnRequest')}
        </p>
      </div>
    </article>
  );
}
