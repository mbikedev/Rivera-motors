import { MapPin, Navigation, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { SiteSettings, Vehicle } from '@/lib/data/types';
import { formatAddress } from '@/lib/utils/address';
import { directionsUrl, telHref } from '@/lib/utils/format';

/** Call to action: visit on site, call, directions. No purchase or reservation online. */
export async function VisitCta({ vehicle, settings }: { vehicle: Vehicle; settings: SiteSettings }) {
  const t = await getTranslations('detail');
  const { contact } = settings;
  return (
    <section
      aria-labelledby="visit-cta-title"
      className="border-accent/30 bg-accent-soft space-y-4 rounded-xl border-2 p-5"
    >
      <h2 id="visit-cta-title" className="text-lg font-semibold">
        {t('ctaTitle')}
      </h2>
      <p className="text-sm">
        {t('ctaText')}{' '}
        <span className="font-semibold">
          {t('reference')}: {vehicle.slug}
        </span>
      </p>
      <div className="grid gap-2">
        <Button asChild variant="accent" size="lg">
          <Link href="/visit">
            <MapPin aria-hidden /> {t('ctaVisit')}
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={telHref(contact.phone)}>
              <Phone aria-hidden /> {t('ctaCall')}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={directionsUrl(formatAddress(contact), contact.latitude, contact.longitude)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation aria-hidden /> {t('ctaDirections')}
            </a>
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {contact.phoneDisplay} · {formatAddress(contact)}
      </p>
    </section>
  );
}
