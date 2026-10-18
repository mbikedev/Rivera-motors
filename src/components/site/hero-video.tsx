import Image from 'next/image';

/**
 * Decorative looping montage of the demo photos (built by scripts/build-hero-video.sh).
 * Visitors who prefer reduced motion get the static poster instead of the video.
 */
export function HeroVideo() {
  return (
    <div aria-hidden className="relative aspect-[8/5] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15">
      <video
        className="size-full object-cover motion-reduce:hidden"
        src="/hero/hero.mp4"
        poster="/hero/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <Image
        src="/hero/hero-poster.jpg"
        alt=""
        fill
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="hidden object-cover motion-reduce:block"
      />
    </div>
  );
}
