'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CADENCE_RAD_PER_MS, CRANK_CENTRE, pedalPose } from './pedal';

// The pedalling cyclist. This is the only part of a strip that needs the browser (it
// moves the legs every frame); everything a festival adds is passed in as a slot, so a
// new festival kit never means editing this file.
//
// Drawing units: wheels at x=13 and x=51, crank at (30,24), viewBox -16 -28 98 66.
interface BikeProps {
  scarf: string; // colour of the flowing scarf
  behind?: ReactNode; // drawn behind the wheels: rack cargo, hanging lanterns, balloons
  head?: ReactNode; // on the rider's head
  front?: ReactNode; // in front of the handlebar: basket, bell
  neon?: boolean; // glowing outline, for night scenes
  chakra?: boolean; // front wheel is an Ashoka chakra
  wheelie?: boolean; // periodically lifts the front wheel
  size?: number; // drawing height in px
}

const SCARF_WAVES = 'M38 -2 Q31 -6 25 -2 T10 -3;M38 -2 Q31 1 25 -5 T10 1;M38 -2 Q31 -6 25 -2 T10 -3';
const START_ANGLE = 0.6;

function Spokes({ cx, count }: { cx: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, k) => {
        const a = (k * Math.PI) / count;
        const dx = Math.cos(a) * 9;
        const dy = Math.sin(a) * 9;
        return <line key={k} x1={cx - dx} y1={24 - dy} x2={cx + dx} y2={24 + dy} />;
      })}
    </>
  );
}

export function Bike({ scarf, behind, head, front, neon, chakra, wheelie, size = 52 }: BikeProps) {
  const svg = useRef<SVGSVGElement>(null);
  const legs = useRef<(SVGPathElement | null)[]>([]);
  const cranks = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      svg.current?.pauseAnimations();
      return;
    }
    let frame = requestAnimationFrame(function tick(now) {
      [0, 1].forEach((k) => {
        const { legPath, foot } = pedalPose(START_ANGLE + k * Math.PI + now * CADENCE_RAD_PER_MS);
        legs.current[k]?.setAttribute('d', legPath);
        cranks.current[k]?.setAttribute('x2', String(foot.x));
        cranks.current[k]?.setAttribute('y2', String(foot.y));
      });
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const pose = [0, 1].map((k) => pedalPose(START_ANGLE + k * Math.PI)); // first frame, same on server + client

  return (
    <svg
      ref={svg}
      className={`ps-bike${neon ? ' ps-neon' : ''}`}
      width={Math.round((size * 98) / 66)}
      height={size}
      viewBox="-16 -28 98 66"
      aria-hidden="true"
    >
      <g className={wheelie ? 'ps-wheelie' : undefined} style={wheelie ? { transformOrigin: '13px 24px' } : undefined}>
        {behind}

        <g className="ps-rim">
          <circle cx="13" cy="24" r="10" />
          {!chakra && <circle cx="51" cy="24" r="10" />}
        </g>
        <g className="ps-spokes ps-spin"><Spokes cx={13} count={6} /></g>
        {chakra ? (
          <g className="ps-chakra ps-spin ps-slow">
            <circle cx="51" cy="24" r="10" />
            <Spokes cx={51} count={12} />
            <circle cx="51" cy="24" r="2" className="ps-chakra-hub" />
          </g>
        ) : (
          <g className="ps-spokes ps-spin"><Spokes cx={51} count={6} /></g>
        )}

        <g className="ps-frame">
          <path d="M13 24 L30 24 L25 9 L43 11 L30 24 M13 24 L25 9 M43 11 L51 24 M43 11 L45 6 L50 7 M21 7.5 H28" />
        </g>
        <circle className="ps-ring" cx={CRANK_CENTRE.x} cy={CRANK_CENTRE.y} r="3.4" />

        <g className="ps-rider-body">
          {[1, 0].map((k) => (
            <g key={k}>
              <path ref={(el) => { legs.current[k] = el; }} className={`ps-leg${k ? ' ps-leg-far' : ''}`} d={pose[k].legPath} />
              <line ref={(el) => { cranks.current[k] = el; }} className="ps-crank" x1={CRANK_CENTRE.x} y1={CRANK_CENTRE.y} x2={pose[k].foot.x} y2={pose[k].foot.y} />
              {k === 1 && (
                <>
                  <path className="ps-torso" d="M25 8 L37 -3 M37 -3 L43 1 L46.5 6.5" />
                  <circle className="ps-head" cx="41" cy="-7" r="3.2" />
                </>
              )}
            </g>
          ))}
          {head}
        </g>

        <path className="ps-scarf" style={{ stroke: scarf }} d="M38 -2 Q31 -6 25 -2 T10 -3">
          <animate attributeName="d" dur=".7s" repeatCount="indefinite" values={SCARF_WAVES} />
        </path>
        {front}
      </g>
    </svg>
  );
}
