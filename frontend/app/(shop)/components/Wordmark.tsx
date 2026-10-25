/* eslint-disable @next/next/no-img-element */
// Brand logo: the Stellar mark (image) + the word STELLAR (with a small tagline
// under it) as real text, so the
// name stays crisp, translatable by CSS and editable in code. Height is
// CSS-controlled; `compact` scales it down for tight spots.
export const BRAND_NAME = 'STELLAR';
export const BRAND_TAGLINE = 'New Midland Cycle Store · Est. 1991';

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`rc-wordmark ${compact ? 'is-compact' : ''}`}>
      <img className="rc-logo" src="/logos/LOGO.png" alt="" aria-hidden="true" />
      <span className="rc-wordmark-words">
        <span className="rc-wordmark-text">{BRAND_NAME}</span>
        <span className="rc-wordmark-tagline">{BRAND_TAGLINE}</span>
      </span>
    </span>
  );
}
