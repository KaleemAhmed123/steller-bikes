import type { CSSProperties } from 'react';

// A tiny seeded random generator (mulberry32). The strips scatter bulbs, sparks and
// stars, and the server and the browser must scatter them in the SAME places or React
// reports a hydration mismatch — so nothing here may use Math.random().
export function seeded(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { between: (lo: number, hi: number) => lo + next() * (hi - lo) };
}

// One decimal is plenty for CSS, and keeps the markup short.
export const r1 = (n: number) => Math.round(n * 10) / 10;

// React types `style` without custom properties; this is the one place that says "trust me".
export const cssVars = (vars: Record<string, string | number>) => vars as unknown as CSSProperties;
