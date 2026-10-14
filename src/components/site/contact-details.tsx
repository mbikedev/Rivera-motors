import { Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import type { SiteSettings } from '@/lib/data/types';
import { formatAddress } from '@/lib/utils/address';
import { directionsUrl, telHref } from '@/lib/utils/format';
import { OpeningHours } from './opening-hours';

/** Address, phone, opening hours and visit notes – the information visitors need to come by. */
export async function ContactDetails({
  settings,
  showHours = true,
  showDirections = true,
}: {
  settings: SiteSettings;
  showHours?: boolean;
  showDirections?: boolean;
}) {
  const t = await getTranslations('site');
  const locale = (await getLocale()) as 'de' | 'en' | 'fr';
  const { contact, visit } = settings;
  const address = formatAddress(contact);
  const visitNote = visit.notes[locale] ?? visit.notes.de;

  return (
    <div className="space-y-5">
      <address className="space-y-3 not-italic">
        <p className="flex gap-3">
          <MapPin className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">{t('address')}: </span>
            {settings.company.legalName}
            <br />
            {contact.street}
            <br />
            {contact.postalCode} {contact.city}
            <br />
            {contact.country}
          </span>
        </p>
        <p className="flex gap-3">
          <Phone className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
          <a href={telHref(contact.phone)} className="font-semibold underline-offset-4 hover:underline">
            <span className="sr-only">{t('phone')}: </span>
            {contact.phoneDisplay}
          </a>
        </p>
        <p className="flex gap-3">
          <Mail className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
          <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
            <span className="sr-only">{t('email')}: </span>
            {contact.email}
          </a>
        </p>
      </address>
      {showHours ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Clock className="text-accent size-5" aria-hidden />
            {t('openingHours')}
          </h3>
          <OpeningHours hours={settings.openingHours} />
          <p className="text-muted-foreground text-sm">
            {visit.appointmentRequired ? t('appointment') : t('noAppointment')}
            {visitNote ? <span className="mt-1 block">{visitNote}</span> : null}
          </p>
        </div>
      ) : null}
      {showDirections ? (
        <Button asChild variant="outline">
          <a
            href={directionsUrl(address, contact.latitude, contact.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation aria-hidden /> {t('directions')}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
