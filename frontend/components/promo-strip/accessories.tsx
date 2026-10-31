// Festival kit for the rider. Each piece is a small SVG fragment drawn in the bike's own
// units (see Bike.tsx) and handed to <Bike> through a slot: `behind`, `head` or `front`.
// A new festival adds a piece here; Bike itself never changes.

function starPath(cx: number, cy: number, outer: number, inner: number, points: number) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i * Math.PI) / points - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

/* ---- behind the wheels ---- */

// Cargo and hanging things all sit on a rear rack; this draws the rack itself.
const Rack = () => <path className="ps-frame ps-rack" d="M-4 12 H22 M5 12 L13 24" />;

export const GiftRack = () => (
  <g>
    <Rack />
    <rect x="-2" y="3" width="11" height="9" fill="#e53945" />
    <rect x="2.3" y="3" width="2.4" height="9" fill="#fff" />
    <rect x="-2" y="6.6" width="11" height="2" fill="#fff" />
    <circle cx="3.5" cy="2.4" r="1.7" fill="#fff" />
    <rect x="9" y="6" width="9" height="6" fill="#1f9d55" />
    <rect x="12.3" y="6" width="2.4" height="6" fill="#fff" />
    <rect x="9" y="8" width="9" height="1.6" fill="#fff" />
  </g>
);

export const FlagRack = () => (
  <g>
    <Rack />
    <line x1="-1" y1="12" x2="-1" y2="-19" stroke="#cfc9b6" strokeWidth="1.3" />
    <g className="ps-flag" style={{ transformOrigin: '-1px -19px' }}>
      <rect x="-1" y="-19" width="19" height="4" fill="#ff9933" />
      <rect x="-1" y="-15" width="19" height="4" fill="#fff" />
      <rect x="-1" y="-11" width="19" height="4" fill="#138808" />
      <circle cx="8.5" cy="-13" r="1.6" fill="none" stroke="#1c3fa8" strokeWidth=".6" />
    </g>
  </g>
);

// A lantern that swings from the end of the rack.
export const StarLantern = () => (
  <g>
    <Rack />
    <g transform="translate(-3 12)">
      <g className="ps-sway">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#cfc9b6" strokeWidth=".9" />
        <g className="ps-glow"><path d={starPath(0, 11, 6, 3, 8)} fill="#ffcf6b" /></g>
        <circle cx="0" cy="11" r="1.8" fill="#fff4c9" />
        <line x1="0" y1="17" x2="0" y2="21" stroke="#ffb347" strokeWidth="1.2" />
      </g>
    </g>
  </g>
);

export const Fanous = () => (
  <g>
    <Rack />
    <g transform="translate(-3 12)">
      <g className="ps-sway">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#cfc9b6" strokeWidth=".9" />
        <path d="M-1.8 4 A2.4 2.4 0 0 1 1.8 4Z" fill="#c9a24a" />
        <g className="ps-glow"><path d="M-3.6 5 H3.6 L4.8 14 H-4.8Z" fill="#f3d58a" /></g>
        <path d="M-4.8 14 H4.8 V15.6 H-4.8Z" fill="#c9a24a" />
        <path d="M0 6 V13 M-2.4 6 L-2.8 13 M2.4 6 L2.8 13" stroke="#8a6a1c" strokeWidth=".6" />
      </g>
    </g>
  </g>
);

export const Balloons = () => (
  <g className="ps-balloons" style={{ transformOrigin: '23px 8px' }}>
    <path d="M23 8 L13 -14 M24 8 L25 -16" stroke="#cfc9b6" strokeWidth=".7" fill="none" />
    <ellipse cx="12.5" cy="-20" rx="5.6" ry="6.6" fill="#ff6fa8" />
    <ellipse cx="25.5" cy="-22" rx="5.6" ry="6.6" fill="#9fd0ff" />
    <ellipse cx="11" cy="-22" rx="1.2" ry="2" fill="#fff" opacity=".55" />
    <ellipse cx="24" cy="-24" rx="1.2" ry="2" fill="#fff" opacity=".55" />
  </g>
);

/* ---- on the rider's head ---- */

export const SantaHat = () => (
  <g>
    <path d="M37.6 -8.8 Q39.5 -19.5 47 -13 Q43.4 -11.6 44.8 -8.6Z" fill="#e53945" />
    <ellipse cx="41.2" cy="-8.6" rx="4.5" ry="1.5" fill="#fff" />
    <circle className="ps-pom" cx="47" cy="-13" r="2" fill="#fff" />
  </g>
);

export const PartyHat = () => (
  <g>
    <path d="M38.2 -9 L41.6 -20 L45 -9Z" fill="#ff6fa8" />
    <circle cx="40.2" cy="-12.6" r=".9" fill="#fff" />
    <circle cx="43" cy="-14.6" r=".9" fill="#ffd36b" />
    <circle className="ps-pom" cx="41.6" cy="-20.4" r="1.7" fill="#ffd36b" />
  </g>
);

/* ---- in front of the handlebar ---- */

function Diya({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-2.6 0 H2.6 A2.6 2.6 0 0 1 -2.6 0Z" fill="#e0a93b" />
      <g className="ps-glow">
        <path className="ps-flame" d="M0 -.8 C1.7 -2.4 1.9 -3.9 0 -5.6 C-1.9 -3.9 -1.7 -2.4 0 -.8Z" fill="#ffd36b" />
      </g>
    </g>
  );
}

export const DiyaBasket = () => (
  <g>
    <path d="M47 9 L58 9 L56.2 17 L48.8 17Z" fill="#241a12" stroke="var(--ps-frame)" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M50 9 L50.4 17 M53 9 V17 M56 9 L55.6 17" stroke="var(--ps-frame)" strokeWidth=".6" />
    <Diya x={50} y={8.6} />
    <Diya x={53.5} y={8.2} />
    <Diya x={57} y={8.6} />
  </g>
);

export const BellRing = () => (
  <g className="ps-bell" style={{ transformOrigin: '54px 0px' }}>
    <path d="M52 -1 q2.4 -3.4 5 0 M55 -5 q3 -3 6 0" fill="none" stroke="var(--ps-accent)" strokeWidth="1.1" strokeLinecap="round" />
  </g>
);
