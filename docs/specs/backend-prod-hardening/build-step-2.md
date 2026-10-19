# Build step 2 — Batch 2 (reliability, the LOW items, and dead-code cleanup)

Plain-English walkthrough. Covers MEDIUM-5, the LOW findings, and Task B.

## 1. What changed
- **MEDIUM-5 — The server now shuts down cleanly and never dies silently.** It
  handles `SIGTERM`/`SIGINT` (the "please stop" signals a host sends on
  deploy/restart) by draining in-flight requests and closing the database first.
  A stray crash (unhandled promise or thrown error) is now logged and the process
  exits so the host restarts a clean one. Each request also has a 30-second cap.
- **LOW — Login no longer leaks which emails exist** (staff + customer). A wrong
  email and a wrong password now take the same time.
- **LOW — Idempotency key is scoped per shopper.** Two different shoppers reusing
  the same key can't collide.
- **LOW — Order history read is capped at 100.**
- **Task B — Dead code removed / duplication merged.** One shared helpers file;
  two unused order statuses deleted.

## 2. Why it was needed
- **Shutdown/crash:** hosts restart services by sending `SIGTERM`. Without a
  handler, Node is killed mid-request. And on modern Node, an unhandled promise
  rejection crashes the process with no useful log — you'd see a dead service and
  no reason why.
- **Login timing:** when the account didn't exist, the old code skipped the
  password check, so "no such email" answered faster than "wrong password". That
  tiny time difference lets an attacker harvest which emails are registered.
- **Idempotency key:** the key is chosen by the browser and *was* globally unique.
  If two shoppers ever sent the same one, the second was handed the first's order.
- **Order-history cap:** an unbounded read grows with a customer's lifetime order
  count. 100 is far more than any real shopper needs on one screen.
- **Dead code:** the duplicate-key check and the search-text escaper were copied
  in 2–3 files (drift risk); the `paymentStatus` list carried two values
  (`pending`, `failed`) no code ever set.

## 3. How it works, step by step

**Graceful shutdown + crash handlers** ([src/index.ts](../../../backend/src/index.ts))
1. After the server starts listening, it registers `SIGTERM` and `SIGINT`
   handlers. On either, `shutdown()` runs.
2. `shutdown()` calls `server.close()` — stop taking new connections, let
   in-flight ones finish — then `mongoose.disconnect()`, then `process.exit(0)`.
3. A 10-second `setTimeout` (itself `unref()`-ed) force-exits if something hangs,
   so shutdown can't stall forever.
4. Two process-level handlers, `unhandledRejection` and `uncaughtException`, log
   the problem and `exit(1)` — fail fast, let the host bring up a clean instance.
5. `server.requestTimeout = 30_000` caps any single request at 30 seconds.

**Login timing** ([src/routes/auth.ts](../../../backend/src/routes/auth.ts), [src/routes/account.ts](../../../backend/src/routes/account.ts))
1. A module-level `DUMMY_HASH` is computed once (a bcrypt hash of a throwaway
   string). **bcrypt** = the slow, deliberate password-hashing function.
2. On login, the code always runs `bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)`.
   If there's no user, it compares against the dummy — same work, same time.
3. The result is still rejected when the user is missing/inactive; the point is
   only that the *timing* no longer reveals whether the email exists.

**Owner-scoped idempotency** ([src/models/order.ts](../../../backend/src/models/order.ts), [src/lib/checkout.ts](../../../backend/src/lib/checkout.ts))
1. The unique index changed from `idempotencyKey` alone to the pair
   `{ owner, idempotencyKey }`. So the key only has to be unique *per shopper*.
2. Every "has this key already been used?" lookup now also filters by `owner`.
3. A shopper's own double-submit is still blocked (same owner + same key); a
   different shopper's identical key is simply a different row.

**Shared helpers** ([src/lib/mongo.ts](../../../backend/src/lib/mongo.ts))
- `isDuplicateKeyError(err)` — true when Mongo reports error code 11000 (a
  unique-index violation). Used by checkout and the product routes.
- `escapeRegex(text)` — makes user search text safe to drop into a `RegExp` for a
  Mongo query. Used by product search, the admin order table, and the payments
  table. The old local copies are gone.

## 4. Files / functions changed
- **`backend/src/index.ts`** — NEW `shutdown()`; `SIGTERM`/`SIGINT` handlers;
  `unhandledRejection`/`uncaughtException` handlers; `server.requestTimeout`.
  Added `mongoose` + `node:http` `Server` type imports.
- **`backend/src/routes/auth.ts`** — `DUMMY_HASH`; always-compare login.
- **`backend/src/routes/account.ts`** — `DUMMY_HASH`; always-compare login.
- **`backend/src/models/order.ts`** — compound unique index
  `{owner, idempotencyKey}` (field-level `unique` removed); dropped `'pending'` /
  `'failed'` from the `paymentStatus` enum.
- **`backend/src/lib/checkout.ts`** — all idempotency lookups now `{owner, key}`;
  uses `isDuplicateKeyError`; removed the local copy.
- **`backend/src/routes/orders.ts`** — `.limit(100)` on order history.
- **`backend/src/lib/mongo.ts`** — NEW. `isDuplicateKeyError` + `escapeRegex`.
- **`backend/src/routes/admin.ts`**, **`payments.ts`**, **`lib/productQuery.ts`** —
  import the shared helpers; removed the inlined copies.

## 5. Important decisions
- **`unhandledRejection` → exit 1.** On a bad DB at boot, this handler (not
  `start().catch`) is what fires — that's Mongoose surfacing the connection error
  as a stray rejection. Net effect is correct: log + exit 1 so the host restarts.
- **Compound idempotency index — migration note.** On a *fresh* database (this is
  pre-production) Mongoose builds the new index cleanly. If a DB already had the
  old single-field unique index, it must be dropped once by hand — Mongoose won't
  remove it. A `ponytail:` comment in the model records this.
- **Product/dashboard `find({})` left unbounded.** Those must return every product
  (inventory screen, low-stock) — a `.limit()` there would hide data. Only the
  per-shopper order history got a cap.
- **One shared `mongo.ts`**, not two util files — both helpers are about building
  safe Mongo queries, so they share a home.

## 6. Tests / verification (real output)
- `tsc --noEmit` → **typecheck OK**.
- `npm run build` → **exit 0**; `dist/index.js` + `dist/lib/mongo.js` present.
- No-DB suites re-run → **all green** (rateLimit 3, permissions 3, productQuery 7,
  razorpay 4, noteInput 4, productInput 6, popularity 4, cartView 5, email 2).
- Boot smoke (bad `MONGODB_URI`) → module **loads cleanly**, then the crash
  handler logs the connection error and **exits 1** (fail-fast proven).
- Not run against a live server: the `SIGTERM` drain path and the DB-backed
  idempotency suites — both need an Atlas replica set. Logic is typecheck-verified.

## 7. Edge cases and limitations
- **Shutdown drain** isn't exercised here (needs a live DB); the wiring compiles
  and the handlers are registered after `listen`.
- **Login timing** is now uniform for the password check. Signup still returns a
  distinct "already exists" (409) — a deliberate UX-vs-privacy trade-off we kept.
- **Idempotency** change relaxes only the cross-shopper global collision; a single
  shopper's double-submit protection is unchanged.
- **Order-history cap at 100** means a shopper with >100 orders sees their newest
  100. No pagination yet; add it only if a real customer ever approaches that.
