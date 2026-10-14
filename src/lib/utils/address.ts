import type { SiteSettings } from '@/lib/data/types';

export function formatAddress(contact: SiteSettings['contact']): string {
  return [contact.street, `${contact.postalCode} ${contact.city}`.trim(), contact.country].filter(Boolean).join(', ');
}
