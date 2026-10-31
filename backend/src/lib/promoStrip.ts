import { z } from 'zod';

// The storefront promo strip (the bar above the navbar). Its TEXT is the existing
// `announcement` setting; this file adds WHICH look the strip wears and, for the
// countdown look, WHEN it counts down to.
// THE DEFAULTS BELONG HERE and nowhere else — the public + admin GET routes merge them
// over whatever is stored, so a shop that never picked anything still gets a sensible strip.
//
// The looks themselves are drawn by the frontend (components/promo-strip). The server
// therefore checks only the SHAPE of the style key; the frontend falls back to the
// default for a key it does not know. One list of styles, owned by the code that draws them.
export const DEFAULT_STRIP_STYLE = 'everyday';
export const STRIP_STYLE_MAX = 30;

export const stripStyleSchema = z
  .string()
  .trim()
  .min(1)
  .max(STRIP_STYLE_MAX)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'A strip style is lowercase words joined by hyphens, e.g. diwali-night.');

// When the countdown ends, as an ISO timestamp (the admin sends what its date picker made).
// A date in the past is fine: the countdown simply shows zeros.
export const countdownEndsAtSchema = z
  .string()
  .datetime({ message: 'Pick a valid date and time for the countdown.' })
  .transform((iso) => new Date(iso));

// The shop runs on Indian time, so "New Year" means midnight on 1 January in IST (UTC+5:30).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Midnight, 1 January, IST — the next one after `now`.
export function nextNewYear(now: Date = new Date()): Date {
  const istYear = new Date(now.getTime() + IST_OFFSET_MS).getUTCFullYear();
  return new Date(Date.UTC(istYear + 1, 0, 1) - IST_OFFSET_MS);
}

// Stored values win; anything never picked gets its default. The countdown date is
// always sent as an ISO string so the browser has one format to read.
export function withPromoStrip<T extends object>(doc: T | null | undefined, now: Date = new Date()) {
  const stored = doc as { announcementStyle?: string | null; countdownEndsAt?: Date | string | null } | null | undefined;
  const storedEnd = stored?.countdownEndsAt ? new Date(stored.countdownEndsAt) : null;
  const validEnd = storedEnd && !Number.isNaN(storedEnd.getTime()) ? storedEnd : null; // a corrupt value falls back to the default
  return {
    ...(doc ?? {}),
    announcementStyle: stored?.announcementStyle || DEFAULT_STRIP_STYLE,
    countdownEndsAt: (validEnd ?? nextNewYear(now)).toISOString(),
  };
}
