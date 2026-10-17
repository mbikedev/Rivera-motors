import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { ADMIN_LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from './locales';

async function resolveRequestLocale(requested: string | undefined): Promise<Locale> {
  // Public pages pass the locale from the [locale] segment. The admin area has no locale
  // segment and uses its own cookie (German by default).
  if (isLocale(requested)) return requested;
  const fromCookie = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await resolveRequestLocale(await requestLocale);
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Europe/Berlin',
  };
});
