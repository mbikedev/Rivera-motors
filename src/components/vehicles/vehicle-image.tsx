import { Car } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/** next/image wrapper; local demo SVG illustrations are served unoptimised. */
export function VehicleImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  fallbackLabel,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackLabel?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2',
          className,
        )}
      >
        <Car className="size-10" aria-hidden />
        {fallbackLabel ? <span className="text-xs">{fallbackLabel}</span> : null}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith('.svg')}
      className={cn('object-cover', className)}
    />
  );
}
