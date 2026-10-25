'use client';

import { useEffect, useRef } from 'react';
import { safeVideoSrc } from '@/lib/img';

// The background video. It plays ONCE and rests on its last frame (no `loop`). Phones get the portrait file, everything else the
// landscape one. The <source media="…"> list picks the right one straight from the
// server-rendered HTML (fast, no JS needed) — but browsers differ on honouring
// `media` for <video> (one picked the portrait file on a desktop and zoomed it in),
// so after load we CHECK the choice against the same breakpoint the hero CSS uses
// and swap the file if it's wrong. Only one file is downloaded in the normal case.
// Muted + playsInline let it autoplay on phones; CSS object-fit scales it.
// Visitors who ask for reduced motion get a still frame instead of a moving one.
const PHONE = '(max-width: 767px)';
const BUNDLED = {
  phone: '/hero_section_mobile_view_video_compressed.mp4',
  wide: '/hero_section_desktop_view_video_compressed.mp4',
};

// The owner can upload their own hero video(s) in Admin -> Site content. Neither set: the
// bundled pair. Only one set: use it for both screens (so phones never get a stale old video).
export function heroSources(desktop?: string, mobile?: string): { phone: string; wide: string } {
  const d = safeVideoSrc(desktop);
  const m = safeVideoSrc(mobile);
  if (!d && !m) return BUNDLED;
  return { wide: d ?? m!, phone: m ?? d! };
}

export function HeroBackdropVideo({ desktop, mobile }: { desktop?: string; mobile?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { phone: phoneSrc, wide: wideSrc } = heroSources(desktop, mobile);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const phone = window.matchMedia(PHONE);

    const correct = () => {
      const wanted = phone.matches ? phoneSrc : wideSrc;
      if (video.currentSrc && !video.currentSrc.endsWith(wanted)) {
        video.src = wanted; // overrides the <source> list
        video.load();
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause();
      else if (!video.ended) void video.play().catch(() => undefined); // autoplay can be blocked; the first frame still shows
    };

    if (video.currentSrc) correct();
    else video.addEventListener('loadstart', correct, { once: true }); // browser hasn't chosen a source yet
    phone.addEventListener('change', correct); // rotating a tablet / resizing a window
    return () => {
      video.removeEventListener('loadstart', correct);
      phone.removeEventListener('change', correct);
    };
  }, [phoneSrc, wideSrc]);

  return (
    <video key={`${phoneSrc}|${wideSrc}`} ref={ref} className="rc-hero-video" autoPlay muted playsInline preload="metadata" aria-hidden="true">
      <source src={phoneSrc} media={PHONE} />
      <source src={wideSrc} />
    </video>
  );
}
