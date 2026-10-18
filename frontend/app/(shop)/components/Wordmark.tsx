// Code-based brand wordmark: a compact bike-inspired roundel + the Raju Cycles
// logotype. Vector + CSS, so it stays crisp and recolours for light/dark nav.
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`rc-wordmark ${compact ? 'is-compact' : ''}`} aria-label="Raju Cycles">
      <svg className="rc-mark" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" className="rc-mark-ring" />
        <g className="rc-mark-bike" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13" cy="25" r="6" />
          <circle cx="27" cy="25" r="6" />
          <path d="M13 25 L20 25 L24 15 L16 15 M20 25 L23.5 15 M27 25 L22.5 16" />
          <path d="M16 15 L15 12 L18 12" />
        </g>
      </svg>
      <span className="rc-wordmark-text" aria-hidden="true">
        <span className="rc-wordmark-1">Raju</span>
        <span className="rc-wordmark-2">Cycles</span>
      </span>
    </span>
  );
}
