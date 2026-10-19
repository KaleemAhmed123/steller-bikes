# Backend production hardening

## 1. Task
- **Name:** Backend production hardening (fixes from the pre-production audit)
- **Status:** shipped (code-complete + verified; Render deploy config is on the owner)
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

Fix the issues found in the backend pre-production audit, most important first.
The money/stock engine passed the audit; this work hardens the ring around it:
config, abuse limits, deploy packaging, and indexes.

## 2. What you asked for
- Fix **all** audit findings, but **start with the most important**.
- For the `tsx` fix: **do not** add `typescript`/`tsx` as a runtime dependency —
  it bloats the image. Use the **industry-standard** approach (compile at build
  time, ship plain JS).
- Apply that "use the industry-standard solution" rule to **every** fix.
- Rate limiting: **hand-rolled, zero dependencies** (chosen over express-rate-limit).

## 3. Open questions
1. **Rate-limit approach** — library vs hand-rolled?
   - Recommended: `express-rate-limit`.
   - **Your answer:** hand-rolled in-memory limiter, zero deps. (Single Render
     instance, so no shared store / Redis needed.)
2. **SESSION_SECRET strictness in prod** — how strict?
   - **Default taken:** in production, reject missing / dev-default / shorter than
     32 chars. Named here; change if you want a different floor.
3. **Render build/start config** — this is a dashboard setting only you can make.
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`  (runs `node dist/index.js`)
   - Do **not** set `NODE_ENV=production` on the *build* (it would skip the
     compiler); set it on the running service via env vars.

## 4. Plan

### Batch 1 — before deploy (this change)
| # | Finding | Fix | Files |
|---|---------|-----|-------|
| HIGH-1 | SESSION_SECRET dev default in prod | fail-fast in config when prod + missing/default/short | `src/config.ts` |
| HIGH-3 | prod `start` needs `tsx` (a devDep) | `build` script compiles to `dist/`; `start` runs `node dist/index.js`; `tsx` stays dev-only | `package.json`, `.gitignore` |
| HIGH-2 | no rate limiting | tiny in-memory sliding-window limiter on login/signup/reset/verify/checkout | `src/lib/rateLimit.ts`, `src/routes/{auth,account,checkout}.ts` |
| MEDIUM-4 | Order collection unindexed hot queries | add indexes for owner/createdAt/status | `src/models/order.ts` |

### Batch 2 — reliability + LOW items + cleanup (shipped)
- MEDIUM-5: graceful shutdown (SIGTERM/SIGINT) + `unhandledRejection`/`uncaughtException` handlers + `requestTimeout`.
- LOW: login timing enumeration (dummy-hash compare), owner-scoped idempotency key, order-history `.limit(100)`.
- Task B: dedupe the 11000 check + regex-escape into `lib/mongo.ts`; delete dead `paymentStatus` enum values.

### Batch 3 — pagination (shipped)
- Offset pagination (`?page=&limit=`) on the growth-prone list endpoints: storefront
  products, admin products/orders/payments/notes, customer order history. Shared
  `lib/pagination.ts`; backward-compatible response shape (`data` + `pagination`);
  frontend page controls deferred to a follow-up. See `build-step-3.md`.

**Rejected alternatives:**
- `express-rate-limit` — rejected per your dep-size rule (single instance makes a
  library unnecessary).
- Shipping `tsx` as a runtime dep — rejected; it runs the TS loader in prod and
  keeps the compiler in the image. Compile-then-run is the industry norm.

## 5. Tasks
- [x] HIGH-1 — enforce SESSION_SECRET in production (config fail-fast)
- [x] HIGH-3 — build to `dist/`, `start` runs compiled JS, `tsx` dev-only, `dist/` already ignored
- [x] HIGH-2 — in-memory rate limiter + wire onto sensitive routes
- [x] MEDIUM-4 — Order indexes
- [x] Verify: `npm run build`, `npm run typecheck`, limiter self-check, affected tests
- [x] Walkthrough in `build-step-1.md`
- [x] MEDIUM-5 — graceful shutdown + crash handlers + request timeout
- [x] LOW — login timing (dummy-hash), owner-scoped idempotency, order-history limit
- [x] Task B — shared `lib/mongo.ts` (11000 check + regex-escape); dead enum values removed
- [x] Verify Batch 2 + walkthrough in `build-step-2.md`

## 6. Updates
- **2026-10-19** — Spec created. Rate-limit decision: hand-rolled. Build approach
  proven (trial `tsc` emits runnable ESM, exit 0). Starting Batch 1.
- **2026-10-19** — Batch 1 shipped. All four fixes in. Verified: typecheck clean,
  production build emits `dist/index.js`, config guard rejects the dev default in
  prod / boots on a strong secret / leaves dev alone (all three cases run),
  limiter self-check 3/3, all no-DB tests green. Removed the planned test-skip in
  the limiter — no test goes through the routers, so it was dead weight and hid
  the logic. Walkthrough in `build-step-1.md`.
- **2026-10-19** — Batch 2 shipped (MEDIUM-5 + LOW items + Task B). Graceful
  shutdown + crash handlers + request timeout; login timing closed with a
  dummy-hash compare; idempotency scoped to `{owner, key}` (migration note in the
  model); order history capped at 100; shared `lib/mongo.ts` replaces the copied
  11000 check + regex-escape; dead `paymentStatus` values removed. Verified:
  typecheck clean, build exit 0, no-DB tests green, boot smoke exits 1 cleanly on
  a bad DB. SIGTERM drain + DB-backed idempotency not run here (need Atlas).
  Walkthrough in `build-step-2.md`. All audit findings now addressed.
- **2026-10-19** — Batch 3 shipped: offset pagination on the six growth-prone list
  endpoints, backend-only, backward-compatible shape. New `lib/pagination.ts` +
  self-check (5/5). The flat `.limit()` caps on orders/payments/notes/order-history
  are replaced by paging. Verified: typecheck clean, build exit 0, all no-DB tests
  green. Frontend next/prev controls are the agreed follow-up. Scope note: this
  went beyond the original audit (owner asked for it) — the audit itself is fully
  closed as of Batch 2.

## 7. Explanation
See [`build-step-1.md`](build-step-1.md).
