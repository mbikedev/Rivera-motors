'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';

export const CATALOG_QUERY_KEY = 'rm-catalog-query';

/** Returns to the catalogue with the filters the visitor used last (kept in sessionStorage). */
export function BackToCatalog() {
  const t = useTranslations('detail');
  const [query, setQuery] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CATALOG_QUERY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only available after mount
      if (saved) setQuery(Object.fromEntries(new URLSearchParams(saved)));
    } catch {
      // Storage unavailable (private mode): fall back to the unfiltered catalogue.
    }
  }, []);

  return (
    <Link
      href={{ pathname: '/vehicles', query }}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('backToCatalog')}
    </Link>
  );
}

export function RememberCatalogQuery({ query }: { query: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(CATALOG_QUERY_KEY, query);
    } catch {
      // ignore
    }
  }, [query]);
  return null;
}
