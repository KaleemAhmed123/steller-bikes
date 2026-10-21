'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { PLACEHOLDER, safeSrc } from '@/lib/img';

// Drop-in for next/image for product photos. Two safety nets:
//  1. safeSrc() rewrites a disallowed/garbage src to the placeholder BEFORE
//     render, so next/image can never throw on an unconfigured host.
//  2. onError swaps to the placeholder if an allowed image still fails to load
//     at runtime (e.g. a Cloudinary file was deleted).
export function SafeImage({ src, alt, ...rest }: ImageProps) {
  const initial = typeof src === 'string' ? safeSrc(src) : src;
  const [current, setCurrent] = useState(initial);
  return <Image {...rest} alt={alt} src={current} onError={() => setCurrent(PLACEHOLDER)} />;
}
