export const LOCALES = ['de', 'en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';

/** BCP 47 tags used for number and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-GB',
  fr: 'fr-FR',
};

/** Open Graph locale codes. */
export const OG_LOCALE: Record<Locale, string> = {
  de: 'de_DE',
  en: 'en_GB',
  fr: 'fr_FR',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Cookie that stores an explicit language choice made with the language switcher. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
/** Cookie that stores the admin UI language. */
export const ADMIN_LOCALE_COOKIE = 'RM_ADMIN_LOCALE';
