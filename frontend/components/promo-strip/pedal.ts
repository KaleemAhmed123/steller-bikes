import { r1 } from './random';

// The rider's legs: two bones from the hip to a pedal that circles the crank.
// Pure geometry (no DOM), in the bike drawing's own units — see Bike.tsx.
const HIP = { x: 25, y: 8 };
export const CRANK_CENTRE = { x: 30, y: 24 }; // the drawing's crank, shared with Bike.tsx
const CRANK_LENGTH = 5;
const BONE = 12.8; // thigh and shin are the same length

export const CADENCE_RAD_PER_MS = (2 * Math.PI * 1.5) / 1000; // 1.5 turns a second

interface Pose {
  legPath: string; // hip → knee → foot
  foot: { x: number; y: number };
}

export function pedalPose(angle: number): Pose {
  const foot = {
    x: CRANK_CENTRE.x + CRANK_LENGTH * Math.cos(angle),
    y: CRANK_CENTRE.y + CRANK_LENGTH * Math.sin(angle),
  };
  // Two-bone IK: the knee sits where the thigh and shin circles meet, bent forward.
  const dx = foot.x - HIP.x;
  const dy = foot.y - HIP.y;
  const reach = Math.min(Math.hypot(dx, dy), 2 * BONE - 0.05);
  const bend = Math.acos(reach / (2 * BONE));
  const aim = Math.atan2(dy, dx) - bend;
  const knee = { x: HIP.x + BONE * Math.cos(aim), y: HIP.y + BONE * Math.sin(aim) };
  return { legPath: `M${HIP.x} ${HIP.y} L${r1(knee.x)} ${r1(knee.y)} L${r1(foot.x)} ${r1(foot.y)}`, foot: { x: r1(foot.x), y: r1(foot.y) } };
}
