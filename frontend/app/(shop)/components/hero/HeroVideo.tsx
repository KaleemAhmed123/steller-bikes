import Link from 'next/link';
import type { HeroContent } from '@/lib/types';
import { HeroBackdropVideo } from './HeroBackdropVideo';

// Homepage hero: the brand video (plays once, rests on its last frame) with the owner-editable text laid over
// it (Site content admin page). The big "35 YEARS OF MASTERY" is part of the video.
// A server component — the only client piece is the <video> (reduced-motion pause).
// Every text line is optional: an empty field simply isn't rendered.
export function HeroVideo({ hero }: { hero: HeroContent }) {
  const promo = (
    <>
      {hero.promoTitle && <span className="rc-hero-promo-title">{hero.promoTitle}</span>}
      {hero.promoSubtitle && <span className="rc-hero-promo-sub">{hero.promoSubtitle}</span>}
    </>
  );
  const hasPromo = Boolean(hero.promoTitle || hero.promoSubtitle);

  return (
    <section className="rc-hero" aria-label="Stellar Bikes">
      <h1 className="rc-sr-only">Stellar Bikes — 35 years of mastery, affordable bicycles in Kanpur</h1>
      <HeroBackdropVideo desktop={hero.videoDesktop} mobile={hero.videoMobile} />
      <div className="rc-hero-scrim" aria-hidden="true" />

      <div className="rc-hero-overlay">
        <div className="rc-hero-left">
          {(hero.statValue || hero.statLabel) && (
            <p className="rc-hero-stat">
              {hero.statValue && <span className="rc-hero-stat-value">{hero.statValue}</span>}
              {hero.statLabel && <span className="rc-hero-stat-label">{hero.statLabel}</span>}
            </p>
          )}
          {(hero.tagline || (hero.ctaLabel && hero.ctaHref)) && (
            <div className="rc-hero-cta">
              {hero.tagline && <p className="rc-hero-tagline">{hero.tagline}</p>}
              {hero.ctaLabel && hero.ctaHref && (
                <Link href={hero.ctaHref} className="rc-btn rc-btn--gold rc-hero-btn">
                  {hero.ctaLabel}
                </Link>
              )}
            </div>
          )}
        </div>

        {hasPromo &&
          (hero.promoHref ? (
            <Link href={hero.promoHref} className="rc-hero-promo is-link">
              {promo}
            </Link>
          ) : (
            <div className="rc-hero-promo">{promo}</div>
          ))}
      </div>
    </section>
  );
}
