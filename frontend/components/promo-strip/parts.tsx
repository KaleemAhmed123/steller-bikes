import type { ReactNode } from 'react';
import { cssVars, r1, seeded } from './random';

// The reusable scenery and motion pieces strips are built from. Each is a small
// presentational component; the look lives in promoStrip.css. All of them are
// deterministic (seeded), so server and browser draw the same strip.

export const Message = ({ text }: { text: string }) => <span className="ps-text">{text}</span>;

/* ---- the rider and what it leaves behind ---- */

type TrailKind = 'spark' | 'snow' | 'confetti' | 'puff' | 'star';

// Particles shed from the back wheel; each drifts back, fades and repeats.
export function Trail({ kind, colors, seed = 3 }: { kind: TrailKind; colors?: string[]; seed?: number }) {
  const rnd = seeded(seed);
  const count = kind === 'puff' ? 7 : 12;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className={`ps-trail ps-trail-${kind}`}
          style={cssVars({
            '--y': Math.round(rnd.between(4, 34)),
            '--d': `${r1(rnd.between(1.1, 2))}s`,
            '--dl': `-${r1(rnd.between(0, 2))}s`,
            ...(colors && { '--c': colors[i % colors.length] }),
          })}
        />
      ))}
    </>
  );
}

export const Contrail = () => (
  <span className="ps-contrail" aria-hidden="true">
    <i style={cssVars({ '--c': '#ff9933' })} />
    <i style={cssVars({ '--c': '#fff' })} />
    <i style={cssVars({ '--c': '#1fb81a' })} />
  </span>
);

// Rolls its children (a trail + a <Bike>) across the strip, left to right, forever.
// `offsetS` starts it part-way along so the strip is never empty on first paint.
export function Rider({ children, seconds = 15, offsetS = 3, bottom }: { children: ReactNode; seconds?: number; offsetS?: number; bottom?: number }) {
  return (
    <span
      className="ps-abs ps-rider"
      style={cssVars({ '--ps-ride': `${seconds}s`, '--ps-offset': `-${offsetS}s`, ...(bottom === undefined ? {} : { '--ps-bottom': `${bottom}px` }) })}
    >
      {children}
    </span>
  );
}

/* ---- decoration ---- */

export function Lights({ count = 26, seed = 11 }: { count?: number; seed?: number }) {
  const rnd = seeded(seed);
  const colors = ['#ff9a2e', '#ffd36b', '#ff6a3a', '#fff0b0'];
  return (
    <div className="ps-lights" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={cssVars({
            '--y': `${r1(((1 - Math.cos((Math.PI / 2) * (i % 4))) / 2) * 4)}px`, // a gentle swag every four bulbs
            '--c': colors[i % colors.length],
            '--d': `${r1(rnd.between(1.4, 2.8))}s`,
            '--dl': `-${r1(rnd.between(0, 3))}s`,
          })}
        />
      ))}
    </div>
  );
}

export const Garland = () => (
  <div className="ps-abs ps-garland" aria-hidden="true">
    {Array.from({ length: 44 }, (_, i) => (
      <i key={i} className={i % 2 ? 'ps-marigold-light' : 'ps-marigold-deep'} />
    ))}
  </div>
);

export function Fireworks({ colors, count = 5, seed = 7 }: { colors: string[]; count?: number; seed?: number }) {
  const rnd = seeded(seed);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const delay = `-${r1(rnd.between(0, 3.2))}s`;
        return (
          <span
            key={i}
            className="ps-abs ps-fw"
            style={{ left: `${r1(5 + ((i + rnd.between(0.1, 0.8)) * 90) / count)}%`, top: `${r1(rnd.between(24, 62))}%` }}
          >
            {Array.from({ length: 12 }, (_, j) => (
              <b key={j} style={cssVars({ '--a': `${j * 30}deg`, '--c': colors[i % colors.length], '--dl': delay })} />
            ))}
          </span>
        );
      })}
    </>
  );
}

export function Stars({ count, seed = 5 }: { count: number; seed?: number }) {
  const rnd = seeded(seed);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className="ps-abs ps-star"
          style={cssVars({ '--x': `${r1(rnd.between(2, 98))}%`, '--y': `${Math.round(rnd.between(8, 88))}%`, '--d': `${r1(rnd.between(1.6, 3.6))}s`, '--dl': `-${r1(rnd.between(0, 3))}s` })}
        />
      ))}
    </>
  );
}

export const HOLI_PALETTE = ['#ff2d95', '#ffe14d', '#36e0a0', '#3fb8ff', '#a66bff'];

export function ColourClouds({ seed = 9 }: { seed?: number }) {
  const rnd = seeded(seed);
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          className="ps-cloud"
          style={cssVars({
            '--x': `${Math.round(rnd.between(0, 92))}%`,
            '--y': `${Math.round(rnd.between(-20, 40))}%`,
            '--s': `${Math.round(rnd.between(36, 66))}px`,
            '--c': HOLI_PALETTE[i % HOLI_PALETTE.length],
            '--d': `${r1(rnd.between(3, 6))}s`,
            '--dl': `-${r1(rnd.between(0, 5))}s`,
          })}
        />
      ))}
    </>
  );
}

export function HangingLantern({ side, left }: { side: 'left' | 'right'; left: string }) {
  return (
    <span className={`ps-abs ps-hanging ps-hanging-${side}`} style={{ left }}>
      <svg width="22" height="46" viewBox="-11 0 22 46" aria-hidden="true">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#c9a24a" strokeWidth="1" />
        <path d="M-3 14 A3 3 0 0 1 3 14Z" fill="#c9a24a" />
        <g className="ps-glow"><path d="M-6 16 H6 L8 34 H-8Z" fill="#f3d58a" /></g>
        <path d="M-8 34 H8 V37 H-8Z" fill="#c9a24a" />
        <path d="M0 18 V33 M-3.5 18 L-4.5 33 M3.5 18 L4.5 33" stroke="#8a6a1c" strokeWidth=".8" />
        <path d="M0 37 V43" stroke="#c9a24a" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

export const Crescent = () => (
  <svg className="ps-abs ps-crescent" width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 3a9 9 0 1 0 5 15 7.5 7.5 0 0 1-5-15z" fill="#f3d58a" />
  </svg>
);

// Pure-CSS bands (their art is a data-URI background), so they need no markup of their own.
export const CandyChain = () => <div className="ps-abs ps-chain" aria-hidden="true" />;
export const Chevrons = () => <div className="ps-abs ps-chevrons" aria-hidden="true" />;
export const LaneLine = () => <div className="ps-abs ps-lane" aria-hidden="true" />;
export const SaleTag = ({ side }: { side: 'left' | 'right' }) => <span className={`ps-sale-tag ps-sale-tag-${side}`}>Sale</span>;
