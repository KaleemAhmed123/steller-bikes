import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination, pageMeta } from '../src/lib/pagination.js';

test('defaults when nothing is passed', () => {
  const p = parsePagination({});
  assert.deepEqual(p, { page: 1, limit: 24, skip: 0 });
});

test('computes skip from page and limit', () => {
  assert.equal(parsePagination({ page: '3', limit: '10' }).skip, 20);
});

test('clamps a too-large limit to the max instead of falling back', () => {
  assert.equal(parsePagination({ limit: '9999' }, { maxLimit: 100 }).limit, 100);
});

test('bad / out-of-range values fall back safely', () => {
  assert.equal(parsePagination({ page: 'abc' }).page, 1); // unparseable -> 1
  assert.equal(parsePagination({ page: '-5' }).page, 1); // below 1 -> 1
  assert.equal(parsePagination({ limit: '0' }).limit, 1); // valid int, clamped to floor of 1
  assert.equal(parsePagination({ limit: 'xyz' }).limit, 24); // unparseable -> default
});

test('pageMeta reports totals and whether more pages exist', () => {
  const first = pageMeta(25, parsePagination({ page: '1', limit: '10' }));
  assert.deepEqual(first, { page: 1, limit: 10, total: 25, totalPages: 3, hasMore: true });

  const last = pageMeta(25, parsePagination({ page: '3', limit: '10' }));
  assert.equal(last.hasMore, false); // page 3 of 3

  assert.equal(pageMeta(0, parsePagination({})).totalPages, 1); // never zero pages
});
