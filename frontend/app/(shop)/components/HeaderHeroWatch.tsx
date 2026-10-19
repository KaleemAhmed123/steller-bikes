'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

// Flips the header to "over-hero" mode (white links, dark scrim, no bar) while
// the dark hero sits under the header, and back to the solid light bar (dark
// links) once scrolled past it. Pages with no `.rc-hero` stay on the light bar.
//
// useLayoutEffect + an immediate synchronous set (before the observer's first
// async callback) means the dark state is applied before paint — no flash of the
// light header at the top of the hero. Re-checks on route change via the dep.
export function HeaderHeroWatch() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const body = document.body;
    const hero = document.querySelector('.rc-hero');
    if (!hero) {
      body.removeAttribute('data-over-hero');
      return;
    }
    // Assume we start over the hero (it's at the top) — set it now, before paint.
    body.setAttribute('data-over-hero', 'true');
    // rootMargin shrinks the top of the viewport by the header height, so the
    // flip happens exactly when the hero scrolls up past the header.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) body.setAttribute('data-over-hero', 'true');
        else body.removeAttribute('data-over-hero');
      },
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    io.observe(hero);
    return () => {
      io.disconnect();
      body.removeAttribute('data-over-hero');
    };
  }, [pathname]);
  return null;
}
