import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, type Locale } from '@/i18n/locales';
import type { AppPathname } from '@/i18n/routing';
import { env } from '@/lib/env';

type Href = AppPathname | { pathname: '/vehicles/[slug]'; params: { slug: string } };

export function localizedPath(locale: Locale, href: Href): string {
  return getPathname({ locale, href: href as never });
}

export function absoluteUrl(path: string): string {
  return `${env.siteUrl}${path}`;
}

/** canonical + hreflang alternates (de, en, fr, x-default → German). */
export function alternatesFor(locale: Locale, href: Href): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(localizedPath(l, href));
  languages['x-default'] = absoluteUrl(localizedPath(DEFAULT_LOCALE, href));
  return { canonical: absoluteUrl(localizedPath(locale, href)), languages };
}

export function pageMetadata(options: {
  locale: Locale;
  href: Href;
  title: string;
  description: string;
  images?: string[];
  noindex?: boolean;
}): Metadata {
  const { locale, href, title, description, images, noindex } = options;
  return {
    title,
    description,
    alternates: alternatesFor(locale, href),
    openGraph: {
      title,
      description,
      url: absoluteUrl(localizedPath(locale, href)),
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type: 'website',
      images: images?.map((url) => ({ url: url.startsWith('/') ? absoluteUrl(url) : url })),
    },
    twitter: { card: images?.length ? 'summary_large_image' : 'summary', title, description },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
