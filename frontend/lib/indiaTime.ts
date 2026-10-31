// The shop runs on Indian time (IST, UTC+5:30, no daylight saving). The admin's date picker
// is read and written in IST, so the owner sees the same clock time whatever device they use.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ISO timestamp → the "YYYY-MM-DDTHH:mm" text a <input type="datetime-local"> wants, in IST.
export function isoToIstInput(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '' : new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);
}

// The picker's IST text → an ISO timestamp ('' if the picker is empty or incomplete).
export function istInputToIso(local: string): string {
  const ms = Date.parse(`${local}:00+05:30`);
  return Number.isNaN(ms) ? '' : new Date(ms).toISOString();
}
