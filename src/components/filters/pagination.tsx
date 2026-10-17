import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { filtersToSearchParams } from '@/lib/data/filters';
import type { VehicleFilters } from '@/lib/data/types';
import { cn } from '@/lib/utils/cn';

function pageWindow(page: number, count: number): Array<number | 'gap'> {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export async function Pagination({
  action,
  filters,
  page,
  pageCount,
}: {
  action: string;
  filters: VehicleFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const t = await getTranslations('catalog');
  const href = (p: number) => {
    const qs = filtersToSearchParams({ ...filters, page: p }).toString();
    return qs ? `${action}?${qs}` : action;
  };

  return (
    <nav aria-label={t('pagination')} className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <a href={href(page - 1)} rel="prev" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ChevronLeft aria-hidden /> {t('previous')}
        </a>
      ) : null}
      <ul className="flex items-center gap-1">
        {pageWindow(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="text-muted-foreground px-1">
              …
            </li>
          ) : (
            <li key={p}>
              <a
                href={href(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={t('pageOf', { page: p, count: pageCount })}
                className={cn(buttonVariants({ variant: p === page ? 'default' : 'ghost', size: 'sm' }), 'min-w-9')}
              >
                {p}
              </a>
            </li>
          ),
        )}
      </ul>
      {page < pageCount ? (
        <a href={href(page + 1)} rel="next" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          {t('next')} <ChevronRight aria-hidden />
        </a>
      ) : null}
    </nav>
  );
}
