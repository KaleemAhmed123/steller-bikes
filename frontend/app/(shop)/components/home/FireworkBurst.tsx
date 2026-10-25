import type { CSSProperties } from 'react';

// A celebration: crackers going off in the corner of the offer section. Pure CSS
// (no library, no JS) — each burst is a ring of tiny sparks that shoot outward,
// glow, fade, then repeat on a staggered delay so it reads as crackers being let
// off now and then. Angles/distances come from the index, so server and client
// render identically (no hydration mismatch). Decorative: aria-hidden, never
// blocks clicks, and switched off for visitors who prefer reduced motion.
// ponytail: CSS sparks only; a <canvas> particle system is the upgrade if the
// owner ever wants a more realistic show.

const BURSTS = [
  { x: '90%', y: '24%', delay: 0, reach: 78 },
  { x: '76%', y: '52%', delay: 1.3, reach: 62 },
  { x: '95%', y: '60%', delay: 2.5, reach: 54 },
];
const COLOURS = ['#f4a522', '#ff9f00', '#ffd166'];
const SPARKS = 14;

export function FireworkBurst() {
  return (
    <div className="rc-fireworks" aria-hidden="true">
      {BURSTS.map((b, bi) => (
        <span
          key={bi}
          className="rc-burst"
          style={{ left: b.x, top: b.y, '--delay': `${b.delay}s`, '--reach': `${b.reach}px` } as CSSProperties}
        >
          {Array.from({ length: SPARKS }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--a': `${(360 / SPARKS) * i}deg`,
                  '--d': 0.8 + (i % 3) * 0.2, // alternate short / long sparks
                  '--c': COLOURS[i % COLOURS.length],
                } as CSSProperties
              }
            />
          ))}
        </span>
      ))}
    </div>
  );
}
