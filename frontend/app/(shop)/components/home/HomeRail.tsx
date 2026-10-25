import Link from 'next/link';
import type { CSSProperties } from 'react';

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
  eyebrow?: string;
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
        {eyebrow && <span className="rc-eyebrow">{eyebrow}</span>}
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
