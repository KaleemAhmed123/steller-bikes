'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { MediaItem } from '@/lib/types';
import { safeSrc, safeVideoSrc, imgError } from '@/lib/img';
import { ZoomImage } from './ZoomImage';
import { NoMedia } from './NoMedia';
import { useVariantSelection } from './VariantSelection';

export interface GalleryVariant {
  variantId: string;
  media: MediaItem[];
}

// Product gallery for the SELECTED variant: its photos and videos in the order the
// admin set (`position`). No media → the "No Image Available" box. Thumbnails show
// only when there is more than one item. Videos are click-to-play (never autoplay).
export function ProductGallery({ variants, name }: { variants: GalleryVariant[]; name: string }) {
  const { variantId } = useVariantSelection();
  const [active, setActive] = useState({ for: variantId, index: 0 });

  const media = [...(variants.find((v) => v.variantId === variantId)?.media ?? [])]
    .filter((m) => m.type !== 'video' || safeVideoSrc(m.url))
    .sort((a, b) => a.position - b.position);

  // Changing variant starts again at its first item (derived, so no effect needed).
  const index = active.for === variantId ? Math.min(active.index, Math.max(media.length - 1, 0)) : 0;
  const current = media[index];

  if (!current) {
    return (
      <div className="rc-gallery">
        <NoMedia />
      </div>
    );
  }

  return (
    <div className="rc-gallery">
      {current.type === 'video' ? (
        <div className="rc-zoom rc-zoom--video">
          <video
            key={current.url}
            src={safeVideoSrc(current.url) ?? undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={`${name} — video ${index + 1}`}
          />
        </div>
      ) : (
        <ZoomImage src={current.url} alt={`${name} — illustrative sample photo`} />
      )}

      {media.length > 1 && (
        <div className="rc-gallery-thumbs" role="group" aria-label={`${name} photos and videos`}>
          {media.map((m, i) => (
            <button
              key={m.url + i}
              type="button"
              className={`rc-gallery-thumb ${i === index ? 'is-active' : ''}`}
              aria-label={`Show ${m.type} ${i + 1} of ${media.length}`}
              aria-pressed={i === index}
              onClick={() => setActive({ for: variantId, index: i })}
            >
              {m.type === 'video' ? (
                <span className="rc-gallery-thumb-video" aria-hidden="true">
                  <Play strokeWidth={1.75} />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeSrc(m.url)} alt="" aria-hidden="true" loading="lazy" onError={imgError} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
