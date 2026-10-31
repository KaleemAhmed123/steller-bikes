// Plain calendar maths for the admin date picker. No time zones involved: these are
// wall-clock dates ("3 Nov 2026"), so everything runs on UTC dates to stay DST-proof.

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarDay {
  year: number;
  month: number; // 0 = January
  day: number;
  inMonth: boolean; // false for the greyed days from the neighbouring months
}

// Always 42 cells (6 weeks, Sunday first) so the picker never changes height between months.
export function monthGrid(year: number, month: number): CalendarDay[] {
  const startOffset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month, 1 - startOffset + i));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month };
  });
}

// Step a (year, month) pair by whole months, wrapping the year.
export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

// The wall-clock reading of a "YYYY-MM-DDTHH:mm" string.
export interface WallClock {
  year: number;
  month: number; // 0 = January
  day: number;
  hour: number; // 0–23
  minute: number;
}

export function parseWallClock(local: string): WallClock | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  return m ? { year: +m[1], month: +m[2] - 1, day: +m[3], hour: +m[4], minute: +m[5] } : null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatWallClock({ year, month, day, hour, minute }: WallClock): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}

// "Tue, 3 Nov 2026 · 8:00 PM"
export function describeWallClock({ year, month, day, hour, minute }: WallClock): string {
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month, day)).getUTCDay()];
  const hour12 = hour % 12 || 12;
  return `${weekday}, ${day} ${MONTHS[month].slice(0, 3)} ${year} · ${hour12}:${pad2(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
}
