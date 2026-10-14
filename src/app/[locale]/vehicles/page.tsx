import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FilterPanel } from '@/components/filters/filter-panel';
import { Pagination } from '@/components/filters/pagination';
import { Button } from '@/components/ui/button';
import { RememberCatalogQuery } from '@/components/vehicles/back-to-catalog';
import { VehicleGrid } from '@/components/vehicles/vehicle-grid';
import { resolveLocale } from '@/i18n/server';
import { countActiveFilters, filtersToSearchParams, parseVehicleFilters } from '@/lib/data/filters';
import { getVehicleRepository } from '@/lib/data/repository';
import { localizedPath, pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/vehicles'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const filters = parseVehicleFilters(await searchParams);
  return pageMetadata({
    locale,
    href: '/vehicles',
    title: t('title'),
    description: t('description'),
    // Filtered result pages are not indexed; the canonical points to the unfiltered catalogue.
    noindex: countActiveFilters(filters) > 0 || filters.page > 1,
  });
}

export default async function VehiclesPage({ params, searchParams }: PageProps<'/[locale]/vehicles'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('catalog');
  const filters = parseVehicleFilters(await searchParams);
  const repository = getVehicleRepository();
  const [result, options] = await Promise.all([
    repository.listVehicles(filters, locale),
    repository.getFilterOptions(),
  ]);
  const action = localizedPath(locale, '/vehicles');
  const query = filtersToSearchParams(filters).toString();
  const activeCount = countActiveFilters(filters);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <RememberCatalogQuery query={query} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </header>

      <FilterPanel key={query} action={action} filters={filters} options={options} activeCount={activeCount} />

      <p className="text-sm font-medium" role="status" aria-live="polite">
        {t('results', { count: result.total })}
      </p>

      {result.items.length ? (
        <VehicleGrid vehicles={result.items} priorityCount={4} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <SearchX className="text-muted-foreground size-10" aria-hidden />
          <h2 className="text-lg font-semibold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground max-w-md">{t('emptyText')}</p>
          {activeCount ? (
            <Button asChild variant="outline">
              <a href={action}>{t('reset')}</a>
            </Button>
          ) : null}
        </div>
      )}

      <Pagination action={action} filters={filters} page={result.page} pageCount={result.pageCount} />
    </div>
  );
}
