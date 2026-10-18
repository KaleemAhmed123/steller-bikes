import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { CardProduct } from '@/lib/catalogue';
import { ProductCard } from '../ProductCard';

// Reusable section header — eyebrow + oversized title + optional "view all".
// `accent` recolours the eyebrow/underline so each section has its own identity.
export function SectionHead({
  eyebrow,
  title,
  blurb,
  href,
  hrefLabel = 'View all',
  tone = 'light',
  accent,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  href?: string;
  hrefLabel?: string;
  tone?: 'light' | 'dark';
  accent?: string;
}) {
  return (
    <div className={`rc-sec-head rc-sec-head--${tone}`} style={{ '--rc-accent': accent } as CSSProperties}>
      <div>
        <span className="rc-eyebrow">{eyebrow}</span>
        <h2 className="rc-sec-title">{title}</h2>
        {blurb && <p className="rc-sec-blurb">{blurb}</p>}
      </div>
      {href && (
        <Link href={href} className="rc-sec-link">
          {hrefLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

// A horizontally-scrolling rail of product cards. Native scroll + scroll-snap
// (no JS, no library) — swipes on touch, scrolls with trackpad/arrow keys.
export function HomeRail({
  eyebrow,
  title,
  blurb,
  cards,
  href,
  tone = 'light',
  accent,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  cards: CardProduct[];
  href?: string;
  tone?: 'light' | 'dark';
  accent?: string;
}) {
  if (cards.length === 0) return null;
  return (
    <section className={`rc-section rc-section--${tone}`} data-reveal>
      <div className="container">
        <SectionHead eyebrow={eyebrow} title={title} blurb={blurb} href={href} tone={tone} accent={accent} />
        <div className="rc-rail" role="list">
          {cards.map((c) => (
            <div className="rc-rail-item" role="listitem" key={c.slug}>
              <ProductCard card={c} tone={tone} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
