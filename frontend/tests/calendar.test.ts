import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeWallClock, formatWallClock, monthGrid, parseWallClock, shiftMonth } from '../lib/calendar';
import { isoToIstInput, istInputToIso } from '../lib/indiaTime';

// The admin date picker's pure maths: the calendar grid, wall-clock text, and India time.

test('a month grid is always 6 weeks, Sunday first', () => {
  const nov2026 = monthGrid(2026, 10); // 1 Nov 2026 is a Sunday
  assert.equal(nov2026.length, 42);
  assert.deepEqual(nov2026[0], { year: 2026, month: 10, day: 1, inMonth: true });
  assert.equal(nov2026.filter((d) => d.inMonth).length, 30);
  assert.deepEqual(nov2026[41], { year: 2026, month: 11, day: 12, inMonth: false });
});

test('a month that starts mid-week is padded with the previous month', () => {
  const jan2027 = monthGrid(2027, 0); // 1 Jan 2027 is a Friday
  assert.deepEqual(jan2027[0], { year: 2026, month: 11, day: 27, inMonth: false });
  assert.deepEqual(jan2027[5], { year: 2027, month: 0, day: 1, inMonth: true });
});

test('stepping months wraps the year both ways', () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test('wall-clock text round-trips and reads naturally', () => {
  const clock = parseWallClock('2026-11-03T20:05');
  assert.ok(clock);
  assert.equal(formatWallClock(clock), '2026-11-03T20:05');
  assert.equal(describeWallClock(clock), 'Tue, 3 Nov 2026 · 8:05 PM');
  assert.equal(describeWallClock({ ...clock, hour: 0 }), 'Tue, 3 Nov 2026 · 12:05 AM');
  assert.equal(describeWallClock({ ...clock, hour: 12 }), 'Tue, 3 Nov 2026 · 12:05 PM');
  assert.equal(parseWallClock('not a date'), null);
});

test('India time: the picker text and the ISO timestamp convert both ways (UTC+5:30)', () => {
  assert.equal(istInputToIso('2027-01-01T00:00'), '2026-12-31T18:30:00.000Z');
  assert.equal(isoToIstInput('2026-12-31T18:30:00.000Z'), '2027-01-01T00:00');
  assert.equal(istInputToIso(''), '');
  assert.equal(isoToIstInput('nonsense'), '');
});
