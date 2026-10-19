/* eslint-disable @next/next/no-img-element */
// Brand logo: the real Stellar mark + wordmark (transparent PNG, brand gold).
// Height is CSS-controlled; `compact` scales it down for tight spots.
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`rc-wordmark ${compact ? 'is-compact' : ''}`}>
      <img className="rc-logo" src="/brand/stellar-logo-gold.png" alt="Stellar Bikes" />
    </span>
  );
}
