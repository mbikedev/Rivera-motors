'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/locales';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function SwitcherLinks({ query, className }: { query?: Record<string, string>; className?: string }) {
  const t = useTranslations('nav');
  const current = useLocale();
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();

  return (
    <nav aria-label={t('language')} className={className}>
      <ul className="flex items-center gap-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          // Keep the same page (and vehicle) when switching language.
          const href = (
            params.slug ? { pathname, params: { slug: params.slug }, query } : { pathname, query }
          ) as never;
          return (
            <li key={locale}>
              <Link
                href={href}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                onClick={() => rememberLocale(locale)}
                className={cn(
                  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold uppercase',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                )}
              >
                <span aria-hidden>{locale}</span>
                <span className="sr-only">{t(`languageNames.${locale}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SwitcherWithQuery({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const query = Object.fromEntries(searchParams.entries());
  return <SwitcherLinks query={Object.keys(query).length ? query : undefined} className={className} />;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<SwitcherLinks className={className} />}>
      <SwitcherWithQuery className={className} />
    </Suspense>
  );
}
