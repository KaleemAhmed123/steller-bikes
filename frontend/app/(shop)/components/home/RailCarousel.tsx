'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CardProduct } from '@/lib/catalogue';
import { ProductCard } from '../ProductCard';
import { SectionHead } from './HomeRail';

// A real carousel: a horizontal scroll-snap track of product cards with
// prev/next arrow buttons and page dots. Native scroll does the heavy lifting
// (swipe on touch, trackpad on desktop); the buttons/dots just drive scrollBy
// and read scrollLeft. No carousel library.
//
// ponytail: page math is scrollLeft/clientWidth rounding — good enough for a
// snap strip; swap for an IntersectionObserver-per-card if exact active-card
// tracking ever matters.
export function RailCarousel({
  eyebrow,
  title,
  blurb,
  cards,
  href,
  tone = 'light',
  accent,
  section,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  cards: CardProduct[];
  href?: string;
  tone?: 'light' | 'dark';
  accent?: string;
  section: string; // the rc-section--* modifier that sets the band background
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    setPages(Math.max(1, Math.round(el.scrollWidth / w)));
    setPage(Math.round(el.scrollLeft / w));
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + w >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Re-measure once layout settles (flex widths, fonts, images) — a single
    // mount measure runs too early and leaves dots/arrows wrong.
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.92, behavior: 'smooth' });
  };
  const goToPage = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (cards.length === 0) return null;
  const showControls = pages > 1 || !atEnd || !atStart;

  return (
    <section
      className={`rc-section ${section} rc-carousel rc-carousel--${tone}`}
      data-reveal
      style={{ '--rc-accent': accent } as CSSProperties}
    >
      <div className="container">
        <SectionHead
          eyebrow={eyebrow}
          title={title}
          blurb={blurb}
          href={href}
          tone={tone}
          accent={accent}
        />

        <div className="rc-carousel-viewport">
          {showControls && (
            <button
              type="button"
              className="rc-carousel-arrow rc-carousel-arrow--prev"
              aria-label="Previous"
              onClick={() => scrollByPage(-1)}
              disabled={atStart}
            >
              <span aria-hidden="true">←</span>
            </button>
          )}

          <div className="rc-carousel-track" ref={trackRef} role="list">
            {cards.map((c) => (
              <div className="rc-carousel-item" role="listitem" key={c.slug}>
                <ProductCard card={c} tone={tone} />
              </div>
            ))}
          </div>

          {showControls && (
            <button
              type="button"
              className="rc-carousel-arrow rc-carousel-arrow--next"
              aria-label="Next"
              onClick={() => scrollByPage(1)}
              disabled={atEnd}
            >
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {pages > 1 && (
          <div className="rc-carousel-dots" role="tablist" aria-label={`${title} pages`}>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                type="button"
                key={i}
                role="tab"
                aria-label={`Go to page ${i + 1}`}
                aria-selected={i === page}
                className={`rc-carousel-dot ${i === page ? 'is-active' : ''}`}
                onClick={() => goToPage(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
