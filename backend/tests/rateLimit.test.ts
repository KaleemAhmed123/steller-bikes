import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from '../src/lib/rateLimit.js';

// Minimal fakes: a request carrying an IP, and a response that records the
// status/headers a block would set. `next` records that a request was allowed.
function fakeReq(ip: string): Request {
  return { ip, socket: {} } as unknown as Request;
}
function fakeRes() {
  const r = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(k: string, v: string) {
      r.headers[k] = v;
    },
    status(code: number) {
      r.statusCode = code;
      return r;
    },
    json(payload: unknown) {
      r.body = payload;
      return r;
    },
  };
  return r;
}

// Drive the middleware N times from one IP; return how many were allowed through.
function hit(mw: ReturnType<typeof rateLimit>, ip: string, times: number) {
  let allowed = 0;
  let lastRes = fakeRes();
  for (let i = 0; i < times; i++) {
    lastRes = fakeRes();
    const next: NextFunction = () => {
      allowed += 1;
    };
    mw(fakeReq(ip), lastRes as unknown as Response, next);
  }
  return { allowed, lastRes };
}

test('allows up to max, then blocks with 429 + Retry-After', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 3 });
  const { allowed, lastRes } = hit(mw, '1.1.1.1', 5);
  assert.equal(allowed, 3); // 3 through, 4th and 5th blocked
  assert.equal(lastRes.statusCode, 429);
  assert.ok(lastRes.headers['Retry-After']); // tells the client when to retry
});

test('separate IPs get separate budgets', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 2 });
  assert.equal(hit(mw, 'a', 2).allowed, 2);
  assert.equal(hit(mw, 'b', 2).allowed, 2); // b is untouched by a's usage
});

test('the window resets after it elapses', async () => {
  const mw = rateLimit({ windowMs: 30, max: 1 });
  assert.equal(hit(mw, '2.2.2.2', 2).allowed, 1); // 1 through, 1 blocked
  await new Promise((r) => setTimeout(r, 45)); // let the window roll over
  assert.equal(hit(mw, '2.2.2.2', 1).allowed, 1); // allowed again
});
