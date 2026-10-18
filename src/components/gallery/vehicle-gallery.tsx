'use client';

import { Expand, PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { Badge } from '@/components/ui/badge';
import { VehicleImage } from '@/components/vehicles/vehicle-image';
import type { VehicleMedia } from '@/lib/data/types';
import { cn } from '@/lib/utils/cn';

function toSlide(media: VehicleMedia, title: string): Slide {
  if (media.mediaType === 'video') {
    return {
      type: 'video',
      sources: [{ src: media.url, type: media.url.endsWith('.webm') ? 'video/webm' : 'video/mp4' }],
      description: media.caption ?? undefined,
    } as Slide;
  }
  return {
    src: media.url,
    alt: media.altText ?? title,
    description: media.caption ?? undefined,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}

export function VehicleGallery({ media, title }: { media: VehicleMedia[]; title: string }) {
  const t = useTranslations('detail');
  const tv = useTranslations('vehicle');
  const tc = useTranslations('common');
  const tCatalog = useTranslations('catalog');
  const [index, setIndex] = useState(-1);
  const [active, setActive] = useState(0);

  if (media.length === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border">
        <VehicleImage src={null} alt="" sizes="100vw" fallbackLabel={tv('noPhoto')} />
      </div>
    );
  }

  const current = media[active] ?? media[0];
  const slides = media.map((m) => toSlide(m, title));

  return (
    <section aria-label={t('gallery')} className="space-y-3">
      <button
        type="button"
        onClick={() => setIndex(active)}
        className="group bg-muted relative block aspect-[4/3] w-full overflow-hidden rounded-xl border"
        aria-label={t('showPhoto', { index: active + 1, count: media.length })}
      >
        {current.mediaType === 'video' ? (
          <span className="flex h-full w-full items-center justify-center bg-black text-white">
            <PlayCircle className="size-16" aria-hidden />
          </span>
        ) : (
          <VehicleImage
            src={current.url}
            alt={current.altText ?? title}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
          />
        )}
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white">
          <Expand className="size-4" aria-hidden /> {tv('photoCount', { count: media.length })}
        </span>
        {current.isDamageView ? (
          <Badge variant="damage" className="absolute top-3 left-3 bg-white">
            {t('damageView')}
          </Badge>
        ) : null}
      </button>
      {current.caption ? <p className="text-muted-foreground text-sm">{current.caption}</p> : null}

      {media.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {media.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                onDoubleClick={() => setIndex(i)}
                aria-label={t('showPhoto', { index: i + 1, count: media.length })}
                aria-pressed={i === active}
                className={cn(
                  'bg-muted relative block aspect-[4/3] w-full overflow-hidden rounded-md border-2',
                  i === active ? 'border-accent' : 'hover:border-input border-transparent',
                )}
              >
                {m.mediaType === 'video' ? (
                  <span className="flex h-full w-full items-center justify-center bg-black text-white">
                    <PlayCircle className="size-6" aria-hidden />
                    <span className="sr-only">{t('video')}</span>
                  </span>
                ) : (
                  <VehicleImage src={m.url} alt={m.altText ?? ''} sizes="120px" />
                )}
                {m.isDamageView ? (
                  <span
                    className="bg-accent absolute right-1 bottom-1 size-2.5 rounded-full ring-2 ring-white"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-muted-foreground text-xs">{t('galleryHint')}</p>

      <Lightbox
        open={index >= 0}
        index={Math.max(index, 0)}
        close={() => setIndex(-1)}
        on={{ view: ({ index: i }) => setActive(i) }}
        slides={slides}
        plugins={[Captions, Counter, Thumbnails, Video, Zoom]}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
        captions={{ descriptionTextAlign: 'center' }}
        labels={{ Close: tc('close'), Previous: tCatalog('previous'), Next: tCatalog('next'), Lightbox: t('gallery') }}
      />
    </section>
  );
}
