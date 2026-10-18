// Static, polished stand-in shown while the 3D canvas mounts, when WebGL/the
// model fails, or under reduced-motion. A large bike silhouette so the hero
// stage never reads as empty. Decorative only (aria-hidden).
export function HeroFallback() {
  return (
    <div className="rc-hero-fallback" aria-hidden="true">
      <svg viewBox="0 0 640 360" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        >
          <circle cx="150" cy="250" r="78" />
          <circle cx="470" cy="250" r="78" />
          <path d="M150 250 L270 250 L360 120 L200 120 M270 250 L345 120 M470 250 L380 130 M380 130 L345 130 M360 120 L400 120" />
          <path d="M200 120 L185 95 L225 95" />
        </g>
      </svg>
    </div>
  );
}
