import { INTL_LOCALE, type Locale } from '@/i18n/locales';

export function kwToHp(kw: number): number {
  return Math.round(kw * 1.35962);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function formatMileage(km: number, locale: Locale): string {
  return `${formatNumber(km, locale)} km`;
}

export function formatPrice(eur: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: eur % 1 === 0 ? 0 : 2,
  }).format(eur);
}

/** Formats an ISO date (YYYY-MM-DD or timestamp) without time-zone shifts. */
export function formatDate(iso: string, locale: Locale, style: 'short' | 'long' = 'short'): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: style === 'long' ? 'long' : 'medium',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

export function formatMonthYear(iso: string, locale: Locale): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  );
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}

export function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Google Maps directions link built from an address or coordinates. */
export function directionsUrl(address: string, lat?: number | null, lng?: number | null): string {
  const destination = lat != null && lng != null ? `${lat},${lng}` : address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}
