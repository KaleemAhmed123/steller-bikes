import Link from 'next/link';
import type { HeroContent } from '@/lib/types';

// "Stellar Originals — Coming Soon". It shows the SAME admin fields as the hero
// corner (promoTitle / promoSubtitle / promoHref), so the owner edits them once.
// It is a link only when the admin has saved a link; otherwise plain text.
export function OriginalsTeaser({ hero }: { hero: HeroContent }) {
  if (!hero.promoTitle && !hero.promoSubtitle) return null;

  const inner = (
    <>
      <span className="rc-originals-glow" aria-hidden="true" />
      {hero.promoTitle && <h2 className="rc-originals-title">{hero.promoTitle}</h2>}
      {hero.promoSubtitle && <span className="rc-originals-pill">{hero.promoSubtitle}</span>}
      <p className="rc-originals-line">Something new from the Stellar workshop is on its way.</p>
    </>
  );

  return (
    <section className="rc-section rc-originals-wrap" data-reveal>
      <div className="container">
        {hero.promoHref ? (
          <Link href={hero.promoHref} className="rc-originals is-link">
            {inner}
          </Link>
        ) : (
          <div className="rc-originals">{inner}</div>
        )}
      </div>
    </section>
  );
}
