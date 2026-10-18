'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** OpenStreetMap embed that is only loaded after an explicit click (no third-party request before consent). */
export function MapEmbed({
  latitude,
  longitude,
  label,
}: {
  latitude: number | null;
  longitude: number | null;
  label: string;
}) {
  const t = useTranslations('site');
  const [loaded, setLoaded] = useState(false);

  if (latitude === null || longitude === null) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm">
        <MapPin className="size-8" aria-hidden />
        {t('mapUnavailable')}
      </div>
    );
  }

  const d = 0.01;
  const bbox = [longitude - d, latitude - d / 2, longitude + d, latitude + d / 2].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

  return loaded ? (
    <iframe
      title={`${t('mapTitle')}: ${label}`}
      src={src}
      className="aspect-[4/3] w-full rounded-xl border"
      loading="lazy"
    />
  ) : (
    <div className="bg-muted flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center">
      <MapPin className="text-accent size-8" aria-hidden />
      <p className="text-muted-foreground max-w-xs text-sm">{t('mapConsent')}</p>
      <Button variant="outline" onClick={() => setLoaded(true)}>
        {t('mapLoad')}
      </Button>
    </div>
  );
}
