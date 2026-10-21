'use client';

import { useRef, useState } from 'react';
import { SafeImage } from '@/components/SafeImage';

// Cursor-follow zoom for the product image — a simple image-inspection aid.
// Pointer devices only; it degrades to a plain image on touch/no-hover, and the
// reduced-motion rule in CSS disables the transition.
export function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('50% 50%');
  const [zoom, setZoom] = useState(false);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div
      ref={ref}
      className={`rc-zoom ${zoom ? 'is-zoom' : ''}`}
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={onMove}
    >
      <SafeImage
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 900px) 100vw, 560px"
        style={{ transformOrigin: origin }}
      />
      <span className="rc-chip-sample">SAMPLE</span>
    </div>
  );
}
