'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative looping background video for the home hero. Muted and inline so browsers allow autoplay;
 * paused (poster only) for visitors who prefer reduced motion.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) video.pause();
      else void video.play().catch(() => {});
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 size-full object-cover"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
    />
  );
}
