import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from './locales';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // German is the default for every new visitor: the Accept-Language header is ignored.
  // An explicit choice (cookie set by the language switcher) is honoured in src/proxy.ts.
  localeDetection: false,
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  pathnames: {
    '/': '/',
    '/vehicles': { de: '/fahrzeuge', en: '/vehicles', fr: '/vehicules' },
    '/vehicles/[slug]': { de: '/fahrzeuge/[slug]', en: '/vehicles/[slug]', fr: '/vehicules/[slug]' },
    '/about': { de: '/ueber-uns', en: '/about', fr: '/a-propos' },
    '/contact': { de: '/kontakt', en: '/contact', fr: '/contact' },
    '/visit': { de: '/besichtigung', en: '/visit', fr: '/visite' },
    '/privacy': { de: '/datenschutz', en: '/privacy', fr: '/confidentialite' },
    '/legal-notice': { de: '/impressum', en: '/legal-notice', fr: '/mentions-legales' },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
