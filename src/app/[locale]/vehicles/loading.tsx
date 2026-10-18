'use client';

import { useTranslations } from 'next-intl';

// Client component: a loading boundary renders outside the page and has no access to its locale param.
export default function Loading() {
  const t = useTranslations('catalog');
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        {t('loading')}
      </p>
      <div className="bg-muted mb-6 h-9 w-48 animate-pulse rounded" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <div className="bg-muted aspect-[4/3] animate-pulse" />
            <div className="space-y-2 p-4">
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
