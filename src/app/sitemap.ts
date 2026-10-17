import type { MetadataRoute } from 'next';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales';
import type { AppPathname } from '@/i18n/routing';
import { getVehicleRepository } from '@/lib/data/repository';
import { absoluteUrl, localizedPath } from '@/lib/seo';

export const revalidate = 3600;

type Href = Parameters<typeof localizedPath>[1];

function entry(href: Href, lastModified?: string, priority?: number): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(localizedPath(locale, href));
  languages['x-default'] = absoluteUrl(localizedPath(DEFAULT_LOCALE, href));
  return {
    url: absoluteUrl(localizedPath(DEFAULT_LOCALE, href)),
    lastModified,
    priority,
    alternates: { languages },
  };
}

/** Multilingual sitemap: one entry per page with hreflang alternates for de, en, fr. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: AppPathname[] = ['/', '/vehicles', '/visit', '/contact', '/about', '/legal-notice', '/privacy'];
  const vehicles = await getVehicleRepository().listPublishedSlugs();
  return [
    ...pages.map((p) => entry(p, undefined, p === '/' ? 1 : p === '/vehicles' ? 0.9 : 0.5)),
    ...vehicles.map((v) => entry({ pathname: '/vehicles/[slug]', params: { slug: v.slug } }, v.updatedAt, 0.8)),
  ];
}
