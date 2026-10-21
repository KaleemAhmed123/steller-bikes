'use client';

import { useState } from 'react';
import { ZoomImage } from './ZoomImage';
import { safeSrc, imgError } from '@/lib/img';

// Product image gallery. The primary `image` plus any extra `images`; a
// thumbnail strip appears only when there's more than one shot, so a
// single-image product renders exactly as before (just the zoom image).
export function ProductGallery({
  image,
  images = [],
  name,
}: {
  image: string;
  images?: string[];
  name: string;
}) {
  const all = [image, ...images.filter((src) => src && src !== image)];
  const [active, setActive] = useState(0);
  const src = all[active] ?? image;

  return (
    <div className="rc-gallery">
      <ZoomImage src={src} alt={`${name} — illustrative sample photo`} />
      {all.length > 1 && (
        <div className="rc-gallery-thumbs" role="group" aria-label={`${name} photos`}>
          {all.map((thumb, i) => (
            <button
              key={thumb + i}
              type="button"
              className={`rc-gallery-thumb ${i === active ? 'is-active' : ''}`}
              aria-label={`Show photo ${i + 1} of ${all.length}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeSrc(thumb)} alt="" aria-hidden="true" loading="lazy" onError={imgError} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
