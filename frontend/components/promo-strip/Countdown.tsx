'use client';

import { useEffect, useState } from 'react';

// Flip-clock counting down to `endsAt` (an ISO timestamp the owner sets in Admin → Promo strip).
// Past the end it shows zeros.
const pad = (n: number) => String(n).padStart(2, '0');

export function Countdown({ endsAt }: { endsAt: string }) {
  // null until the browser mounts, so the server's HTML and the first client render match.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = Date.parse(endsAt);
    if (Number.isNaN(target)) return; // no usable date: leave the tiles on "--"
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const left = secondsLeft ?? 0;
  const tiles = [
    ['Days', Math.floor(left / 86400)],
    ['Hrs', Math.floor((left % 86400) / 3600)],
    ['Min', Math.floor((left % 3600) / 60)],
    ['Sec', left % 60],
  ] as const;

  return (
    <div className="ps-odo" role="timer" aria-label="Time left">
      {tiles.map(([label, value]) => (
        <span className="ps-tile" key={label}>
          {/* keyed by value so each change replays the little flip animation */}
          <b key={value} className="ps-flip">{secondsLeft === null ? '--' : pad(value)}</b>
          <small>{label}</small>
        </span>
      ))}
    </div>
  );
}
