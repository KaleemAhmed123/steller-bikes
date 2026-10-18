'use client';

import { useEffect } from 'react';

// Fades/slides elements marked `data-reveal` in as they enter the viewport.
// Adds `.js-reveal` to <html> first, so without JS (or with reduced-motion)
// everything is simply visible — the animation is pure enhancement.
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('js-reveal');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.revealed)').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    };
    scan();
    // Re-scan when client navigation swaps the page content.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('js-reveal');
    };
  }, []);

  return null;
}
