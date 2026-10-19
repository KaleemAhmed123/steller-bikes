# Build step 1 — Batch 1 (the before-deploy fixes)

Plain-English walkthrough of what shipped. Four fixes: HIGH-1, HIGH-3, HIGH-2, MEDIUM-4.

## 1. What changed
- **HIGH-1 — Session secret is now enforced in production.** The server refuses
  to start in production if the cookie-signing secret is missing, left at the dev
  default, or shorter than 32 characters.
- **HIGH-3 — Industry-standard build.** The app now compiles to plain JavaScript
  in `dist/` and runs that; it no longer runs TypeScript through a dev loader in
  production. The compiler never ships to the running server.
- **HIGH-2 — Rate limiting.** Login, signup, password-reset, email-verify and the
  checkout/payment routes now reject too many requests from one IP (internet
  address) in a short window.
- **MEDIUM-4 — Database indexes** added to the Orders collection for the queries
  the app runs constantly.

## 2. Why it was needed
- **Session secret:** the dev default lives in public git history. If a deploy
  forgot to set a real one, anyone could forge a staff login cookie and take over
  the admin. Now that mistake stops the boot instead of shipping silently.
- **Build:** the old `start` ran the source through `tsx`, a **dev** tool. A
  normal production install skips dev tools, so the server could fail to boot —
  and even when it worked, it ran a dev loader in production.
- **Rate limiting:** nothing stopped an attacker from trying millions of password
  guesses on the owner's login, or spamming the Razorpay order-create endpoint.
- **Indexes:** every "my orders" page and admin table scanned the whole Orders
  collection. Fine at 50 orders, slow at a few thousand.

## 3. How it works, step by step

**Session-secret guard** ([src/config.ts](../../../backend/src/config.ts))
1. All environment variables are validated once at boot with Zod (a schema
   validator). This already existed.
2. A new `.superRefine` step runs after the basic checks. **superRefine** = an
   extra custom rule that can look at several fields together.
3. The rule: *if* `NODE_ENV` is `production` *and* `SESSION_SECRET` is the known
   dev default or under 32 characters → record an error.
4. Any error makes the existing code print the problem and `process.exit(1)` —
   the server never starts. Development is untouched (the dev default still works
   locally).

**Build + start** ([package.json](../../../backend/package.json))
1. `npm run build` runs `tsc` (the TypeScript compiler), which reads `tsconfig`
   (`outDir: dist`) and writes plain JavaScript to `dist/`.
2. Because the source already imports with explicit `.js` paths, the compiled
   output runs directly on Node as ESM (the modern JavaScript module format).
3. `npm start` is now `node dist/index.js` — plain compiled JS, no dev loader.
4. `tsx`/`typescript` stay in `devDependencies`, so they're used at build time
   but never installed into the running server's image.
5. `dev` and the `seed` scripts still use `tsx` — that's fine, they're local-only.

**Rate limiter** ([src/lib/rateLimit.ts](../../../backend/src/lib/rateLimit.ts))
1. `rateLimit({ windowMs, max })` returns an Express middleware (a function that
   runs before a route).
2. It keeps a `Map` of `IP → { count, resetAt }` in memory — a **fixed window**:
   the first request from an IP starts a timer (`resetAt`) and a counter.
3. Each request within the window bumps the counter. Past `max`, it replies
   `429 Too Many Requests` with a `Retry-After` header (how long to wait).
4. When the window elapses, the next request starts a fresh count.
5. A periodic sweep deletes expired entries so the Map can't grow forever. The
   timer is `unref()`-ed so it never keeps the process alive on its own.
6. `req.ip` is the real client IP because `index.ts` sets `trust proxy` (the app
   sits behind Render's proxy).
7. Two shared presets: `loginLimiter` (10 per 15 min — auth routes) and
   `checkoutLimiter` (30 per 10 min — checkout/payment routes).

**Order indexes** ([src/models/order.ts](../../../backend/src/models/order.ts))
- Four indexes: `{owner, createdAt}` (order history), `{createdAt}` (admin lists
  / dashboard recent), `{fulfillmentStatus, createdAt}` (order queue),
  `{paymentStatus, createdAt}` (payments tab). Mongoose builds them on boot.

## 4. Files / functions changed
- **`backend/src/config.ts`** — added `DEV_SESSION_SECRET` constant and a
  `.superRefine` production guard on the env schema.
- **`backend/package.json`** — added `"build": "tsc"`; changed `"start"` to
  `node dist/index.js`. `dev`/`seed` unchanged.
- **`backend/src/lib/rateLimit.ts`** — NEW. `rateLimit()` factory +
  `loginLimiter` / `checkoutLimiter` presets. Zero dependencies.
- **`backend/src/routes/auth.ts`** — `loginLimiter` on `POST /login`.
- **`backend/src/routes/account.ts`** — `loginLimiter` on `signup`, `login`,
  `verify`, `password/forgot`, `password/reset`.
- **`backend/src/routes/checkout.ts`** — `checkoutLimiter` on `/`,
  `/razorpay/order`, `/razorpay/verify`.
- **`backend/src/models/order.ts`** — four `schema.index(...)` calls.
- **`backend/tests/rateLimit.test.ts`** — NEW. Self-check for the limiter.

## 5. Important decisions
- **Hand-rolled limiter, no library** (your call). Correct for one Render
  instance. Marked with a `ponytail:` note: if the API ever runs on more than one
  instance, counts must move to a shared store (Redis) — not before.
- **Compile-then-run, not `tsx` as a runtime dep** (your "industry parameter").
  Keeps the compiler out of the image; standard Node+TypeScript deploy shape.
- **32-char minimum** for the prod session secret — a sane floor for a random
  secret. Say the word to change it.
- **Dropped the planned "skip limiter in tests" branch.** No test drives the
  Express routers (the suites call lib functions directly), so the skip was dead
  code that also hid the limiting logic from its own test. Removed it; the
  limiter is now tested directly.

## 6. Tests / verification (real output)
- `tsc --noEmit` → **typecheck OK** (exit 0).
- `npm run build` → **exit 0**, produces `dist/index.js`, `dist/config.js`,
  `dist/lib/rateLimit.js`.
- Config guard, all three run:
  - prod + dev-default secret → **exit 1**, message "In production, set
    SESSION_SECRET to a random value of at least 32 characters."
  - prod + 40-char secret → **BOOTED production**.
  - development + no secret → **BOOTED development**.
- `tests/rateLimit.test.ts` → **pass 3 / fail 0** (allows up to max then 429 +
  Retry-After; separate IPs separate budgets; window resets).
- All no-DB suites re-run after the changes → **all green** (permissions 3,
  productQuery 7, razorpay 4, noteInput 4, productInput 6, popularity 4,
  cartView 5, email 2).
- Not run: the DB-backed suites (need an Atlas replica set via `MONGODB_URI`);
  unchanged by this batch.

## 7. Edge cases and limitations
- **Limiter is per-process / per-instance.** Two instances wouldn't share counts.
  One instance is the plan; `ponytail:` note marks the upgrade path.
- **Limiter is per-IP.** Many users behind one office/NAT IP share a budget;
  the generous windows (10/15min login, 30/10min checkout) make that unlikely to
  bite a real shop. An attacker rotating IPs isn't fully stopped — rate limiting
  raises the cost, it isn't a lockout.
- **Render must be configured** (dashboard, your side): Build Command
  `npm install && npm run build`, Start Command `npm start`. Do not set
  `NODE_ENV=production` on the *build* or it skips the compiler; set it on the
  running service.
- **Index build:** Mongoose auto-builds indexes on boot. On the current tiny data
  set this is instant; on a very large collection it can take time on first boot.
