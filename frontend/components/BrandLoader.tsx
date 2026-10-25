/* eslint-disable @next/next/no-img-element */
// Full-page loading state: a blank white page with the Stellar mark blinking and the word
// STELLAR appearing one letter at a time, S -> R. Pure CSS (no JS), so it works inside a
// Next `loading.tsx`. It fades in only after a short delay, so a page that loads quickly
// never flashes a splash screen — it only shows when the wait is actually noticeable.
const WORD = 'STELLAR';

export function BrandLoader() {
  return (
    <div className="brand-loader" role="status" aria-live="polite">
      <img className="brand-loader-mark" src="/logos/LOGO.png" alt="" aria-hidden="true" />
      <span className="brand-loader-word" aria-hidden="true">
        {WORD.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${180 + i * 120}ms` }}>
            {ch}
          </span>
        ))}
      </span>
      <span className="rc-sr-only">Loading…</span>
    </div>
  );
}
