'use client';

import Lightbox, { type LightboxExternalProps } from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

/**
 * Full-screen viewer, loaded on demand by VehicleGallery so its JS and CSS are only fetched
 * once a visitor opens a photo (a CSS preload on every page triggered Chrome "preloaded but not used" warnings).
 */
export default function GalleryLightbox(props: LightboxExternalProps) {
  return (
    <Lightbox
      plugins={[Captions, Counter, Thumbnails, Video, Zoom]}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      captions={{ descriptionTextAlign: 'center' }}
      {...props}
    />
  );
}
