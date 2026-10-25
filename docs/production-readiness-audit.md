# Production-Readiness Audit — Stellar Bikes (Stellar Bikes) Storefront + Admin

- **Audit date:** 2026-10-21
- **Repository revision:** `b74c820` (branch `main`) **plus the uncommitted working tree** (many modified + untracked files were present at audit time; see §3). The audit reflects the **working tree**, not just the last commit.
- **Auditor scope:** principal-engineer / security / SRE / QA review, evidence-based, read-only. **No application code was modified.**
- **Launch assumption (owner-confirmed):** **Razorpay online payments go live at launch.** This raises payment-correctness findings to top priority.

---

## Remediation status (addendum — 2026-10-21)

*Appended after the original audit; the findings below are unchanged above. Sprint tracked in [`prelaunch-hardening.md`](specs/prelaunch-hardening.md).*

| Finding | Status | Note |
|---------|--------|------|
| **F-05** Frontend dependency vulns | **Fixed** | `postcss` override → `8.5.31`; production `npm audit` now **0 vulnerabilities**; build passes. Dev-only `braces` advisory (eslint toolchain, no fix, not shipped) accepted. |
| **F-03** Non-deterministic tests | **Fixed** | `mongodb-memory-server` → hermetic in-memory replica set; `npm test` runs offline with no secret, no Atlas. |
| **F-04** No CI | **Fixed** | `.github/workflows/ci.yml` (typecheck + test + build + production audit, Node 22). Owner to set branch protection. |
| **F-10** Authorized-not-captured | **Fixed** | `payment_capture: true` per Razorpay order (API-verified). |
| **F-01** No webhook (Critical) | **Accepted debt** | Online pay is OFF until Razorpay keys exist, so dormant at a COD-only launch. Exact later fix documented in the sprint spec; build the webhook **before enabling online pay**. |
| **F-02** Atlas `0.0.0.0/0` | **Owner action** | To be restricted at deploy. |

**Revised verdict (COD-only launch):** `CONDITIONALLY READY` — the High items that don't need the client's Razorpay account are resolved; F-02 (owner) and branch protection remain. **A Razorpay-live launch stays `NOT READY` until the F-01 webhook is built.**

---

## 1. Title, Audit Date, and Repository Revision

See header above. This report covers the `backend/` (Express + Mongoose API) and `frontend/` (Next.js App Router) applications and their shared operational docs (`playbook.md`, `docs/specs/**`).

**Plain-English note on terms used throughout:**
- **Paise** — 1 rupee = 100 paise; money is stored as whole paise (integers) to avoid rounding bugs.
- **Idempotency key** — a one-time id sent with a checkout so the same submit twice makes only one order.
- **Webhook** — a server-to-server callback: the payment provider calls *your* server directly when something happens, instead of relying on the shopper's browser to report it.
- **Transaction (DB)** — a group of database writes that all succeed or all fail together.
- **RBAC** — Role-Based Access Control: permissions are attached to roles (owner/manager), and every action checks one.

---

## 2. Executive Summary

**Overall verdict: `NOT READY` (for a Razorpay-live launch).**

The codebase is, for its size, **unusually disciplined**: the server is the sole authority on price and stock, the money/stock paths use real MongoDB transactions with atomic guarded decrements and idempotency keys, input is validated with Zod at every boundary, passwords use bcrypt with constant-time login, email tokens are stored hashed, and the Razorpay signature check is timing-safe. Backend `npm audit` is clean (0 vulnerabilities). This is **not** typical AI-generated slop.

It is held back from a payments-live launch by **one confirmed money-loss gap and a small set of pre-launch hardening items.**

- **The blocker (F-01, Critical/P0):** There is **no Razorpay webhook**. A paid order is only ever recorded when the shopper's **browser** calls `/api/checkout/razorpay/verify`. If the browser dies between payment capture and that call (closed tab, lost connection, crash), **Razorpay has the customer's money and your system has no order and no refund record.** The code itself promises a webhook as "the recovery path" (`checkout.ts:199`) but it was never built.

### Findings by severity

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 5 |
| Informational | 3 |
| **Total** | **18** |

### Findings by priority

| Priority | Count |
|----------|-------|
| P0 (must fix before deploy) | 1 |
| P1 (fix before deploy unless formally accepted) | 4 |
| P2 (schedule by risk) | 6 |
| P3 (backlog) | 7 |

### Top risks requiring immediate attention
1. **F-01** — No webhook → captured-but-unrecorded payments (silent customer money loss).
2. **F-02** — MongoDB Atlas network access is open to the whole internet (`0.0.0.0/0`).
3. **F-03** — The test suite is **non-deterministic** and needs a live shared Atlas DB; it cannot gate a release as-is.
4. **F-05** — Frontend dependency vulnerabilities (PostCSS high + moderate) via Next.js 15.1.0.
5. **F-04** — No CI pipeline; nothing automatically runs the checks before deploy.

### Major areas NOT verified
- No live/staging environment was exercised: Razorpay was not driven end-to-end, Atlas production network config was read from docs not inspected, and no load test was run. See §19.

### Most important next actions
Build the webhook (F-01), lock down Atlas networking (F-02), make the test suite hermetic and wire a CI gate (F-03/F-04), and bump the frontend dependencies (F-05). With those four done and re-verified, the verdict moves to `CONDITIONALLY READY`.

---

## 3. Audit Scope and Methodology

**What was done (all read-only):**
- Read the full backend source (`backend/src/**` — 40+ files: config, db, all routes, all libs, all models) and the security/money-critical frontend (`lib/api.ts`, checkout page, admin shell, `next.config.ts`).
- Read operational docs: `playbook.md`, `CLAUDE.md` (root + project), `docs/specs/storefront-rebuild/context/00-overview.md`, `.env.example` (both apps).
- **Executed safe checks** (owner authorised "full safe suite"):
  - `backend`: `npm run typecheck` → **pass (exit 0)**; `npm test` (parallel) → **fail (exit 1), 11 failing**; `npm test` with `--test-concurrency=1` (serial) → **pass, 68/68 + 1 skipped**; `npm audit` → **0 vulnerabilities**.
  - `frontend`: `npm run typecheck` → **pass (exit 0)**; `npm audit` → **2 vulnerabilities (1 high, 1 moderate)**.
  - Repo: `git ls-files` (no `.env` tracked), checked for CI/Docker/deploy config (none).
- Traced critical flows end-to-end: COD checkout, Razorpay pay→verify→finalize, order fulfilment state machine, stock adjust, customer signup/login/verify/reset, admin RBAC.

**What was NOT done:** no code changes, no destructive commands, no live Razorpay calls, no writes to production data, no deployment, no load/benchmark runs, no inspection of the live Atlas/Render/Vercel consoles.

**Confidence language:** *Confirmed* = directly verified in code or by a command I ran. *Partially verified* = strong code/doc evidence but the live behaviour wasn't exercised.

---

## 4. Repository and Architecture Overview

**Shape:** two separate apps, two origins, one database.

```
Customer browser                         Owner/Staff browser
      │                                        │
      ▼                                        ▼
  Next.js 15 (App Router, React 19) — frontend only, never touches the DB
      │  fetch (credentials: include)          │  fetch (session cookie)
      ▼                                        ▼
            Express 4 + TypeScript API  (one app)
   CORS · express-session (Mongo-backed) · Zod validation · bcrypt · RBAC
      │   server recomputes every price, total and stock
      ▼
   MongoDB (Atlas replica set) — transactions for checkout, cancel-restock, adjust
```

**Backend (`backend/src`):**
- `config.ts` — Zod-validated env, fails fast at boot, production guard on `SESSION_SECRET`.
- `index.ts` — app wiring, session, CORS, graceful shutdown, `unhandledRejection`/`uncaughtException` guards.
- `routes/` — products, settings, cart, checkout, orders, auth (staff), account (customer), admin, notes, payments.
- `lib/` — checkout (the transactional core), razorpay (zero-SDK REST + HMAC), inventory, fulfillment (state machine), pricing, auth, customerAuth, permissions (RBAC), rateLimit (in-memory), tokens, email (Resend or console mock), mongo (regex-escape + dup-key helper), pagination, productQuery, etc.
- `models/` — product (variants embedded), order (snapshotted items, compound idempotency index), cart, customer, staff, settings (single doc), inventoryMovement, note.

**Frontend (`frontend/app`):** `(shop)` route group (home 3D hero, shop, product, cart, checkout, account, order, auth pages) and `admin` route group (dashboard, orders, products, inventory, notes, payments, settings, platform). Heavy 3D stack: `three`, `@react-three/fiber/drei/postprocessing`, `gsap`, plus `recharts` and `lucide-react`.

**Separation of concerns is good.** Business rules live in `lib/` as pure-ish functions (fulfillment transitions, payment transitions, pricing, permissions) with their own tests; routes are thin; models hold schema + indexes. No circular-dependency or layering smells were found. The "one idea" (server is authority; admin is permission-gated; build the least that works) is consistently honoured.

**Documentation accuracy:** the docs match the implementation closely. Two small drifts are noted (F-13): stale test counts in `playbook.md` and leftover "React" wording in the overview (the overview already flags this).

---

## 5. Critical Business Flows Reviewed

1. **COD checkout** (`routes/checkout.ts` → `lib/checkout.placeOrder`): validated address/email/key → payment-flag guard → recompute cart from live data → transaction {guarded stock decrement + order insert + movement audit + cart clear}. Idempotency via pre-check + compound unique index + dup-key race handling. **Correct.**
2. **Razorpay pay → verify → finalize** (`checkout.ts` + `lib/razorpay.ts` + `lib/checkout.finalizePaidOrder`): server sets the amount (no stock held) → browser pays in Razorpay popup → browser posts back → server verifies HMAC signature (timing-safe) → **fetches the payment from Razorpay** to confirm real capture + amount → amount must equal live cart total → only then transaction places the PAID order; any mismatch records a `refund_required` order so money is never silently dropped **on the paths that run**. **Strong — but entirely browser-triggered (see F-01).**
3. **Order fulfilment** (`lib/fulfillment.transitionOrder`): legal-transition map, tracking required to ship, cancel restores stock exactly once via a state-guarded update, all in a transaction; cancelling a paid order flips it to `refund_required`. **Correct.**
4. **Manual stock adjust** (`lib/inventory.adjustStock`): atomic guarded `$inc`, can't go negative, writes a movement. **Correct for stock; audit record has a minor concurrency caveat — F-11.**
5. **Customer accounts** (`routes/account.ts`): bcrypt, constant-time login with dummy hash, hashed verify/reset tokens, guest-cart merge on login, guest-order claim only after proven email. **Correct.**
6. **Admin RBAC** (`lib/auth` + `lib/permissions`): `requireAuth` loads active staff from session; `requirePermission` checks one permission per action; every admin route is gated. Client UI gating is cosmetic and the **server enforces independently**. **Correct.**

---

## 6. Production Readiness Verdict

**`NOT READY`** for the owner-confirmed **Razorpay-live** launch, because one **Critical / P0** finding (F-01, silent payment loss with no webhook) remains unresolved.

- If the launch were **COD-only**, F-01 would not apply and the verdict would be **`CONDITIONALLY READY`** subject to the P1 items (F-02 Atlas lockdown, F-03/F-04 test+CI, F-05 deps).
- The release gates are in §10 and §12.

---

## 7. Findings Summary by Severity

| ID | Severity | Priority | Confidence | Title |
|----|----------|----------|------------|-------|
| F-01 | Critical | P0 | Confirmed | No Razorpay webhook → captured payments can be lost with no order/refund record |
| F-02 | High | P1 | Partially verified | MongoDB Atlas network access open to the internet (`0.0.0.0/0`) |
| F-03 | High | P1 | Confirmed | Test suite is non-deterministic and depends on a live shared Atlas DB |
| F-04 | High | P1 | Confirmed | No CI pipeline / no automated pre-deploy checks |
| F-05 | High | P1 | Confirmed | Frontend dependency vulnerabilities (PostCSS high+moderate via Next 15.1.0) |
| F-06 | Medium | P2 | Confirmed | No security headers on API or Next app (HSTS, X-Frame-Options, nosniff) |
| F-07 | Medium | P2 | Confirmed | Rate limiting is in-memory + per-IP only; resets on restart, no account lockout |
| F-08 | Medium | P2 | Confirmed | `/health` doesn't check the DB — not a real readiness probe |
| F-09 | Medium | P2 | Confirmed | Storefront catalogue runs an uncached per-request `$lookup` aggregation, unthrottled |
| F-10 | Medium | P2 | Confirmed | `authorized`-but-not-`captured` Razorpay payments are abandoned (funds held, no record) |
| F-11 | Low | P3 | Confirmed | `adjustStock` audit before/after can be wrong under concurrent manual adjusts |
| F-12 | Low | P3 | Confirmed | Guest cart/order cookie is unsigned (mitigated by unguessable UUID) |
| F-13 | Low | P3 | Confirmed | Documentation drift (stale test counts; "React" wording) |
| F-14 | Low | P3 | Confirmed | `computeTotals` ignores settings; a future shipping/tax value wouldn't apply |
| F-15 | Low | P3 | Confirmed | No 404 handler for unknown API routes; idempotency index migration note |
| F-16 | Informational | P3 | Confirmed | Single-settings-doc `findOne()` has no stable key (nondeterministic if duplicated) |
| F-17 | Informational | P3 | Confirmed | Order-confirmation email is fire-and-forget; silent no-receipt on send failure |
| F-18 | Informational | P3 | Confirmed | Node engine/runtime drift (local v24, `engines` >=20) — pin the production runtime |

---

## 8. Findings Summary by Audit Dimension

- **A. Correctness / business logic:** F-01, F-10, F-11, F-14 (core money/stock logic otherwise correct).
- **D. Security:** F-01, F-02, F-05, F-06, F-07, F-12.
- **F. Error handling / resilience:** F-01, F-08, F-10, F-17.
- **G. Performance / scalability:** F-09.
- **H. Database / persistence:** F-02, F-15, F-16.
- **K. Testing / QA:** F-03, F-04.
- **M. Dependencies / supply chain:** F-05.
- **N. Config / environment:** F-02, F-18.
- **O. Observability:** F-08.
- **Q. Infra / CI-CD:** F-04, F-18.
- **T. Documentation:** F-13.
- **J (queues/distributed), V (AI/LLM):** **N/A** — the system has no queues, workers, schedulers, or LLM/AI components. Multi-tenant isolation and Redis are also N/A (single-tenant shop, Mongo-backed sessions).

---

## 9. Detailed Findings

### [F-01] No Razorpay webhook — captured payments can be lost with no order or refund record

- **Category:** Correctness / Security / Resilience (payments)
- **Severity:** Critical · **Priority:** P0 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/routes/checkout.ts:117-203` (verify is the only finalize path); `backend/src/lib/checkout.ts:199` (comment promising a webhook); `backend/src/index.ts:53-67` (no webhook route mounted). Grep for `webhook` across `backend/src` returns **only the comment**.
- **Affected component:** Online-payment capture → order creation.
- **Evidence:** The *only* code path that records a paid order is `POST /api/checkout/razorpay/verify`, which runs **because the shopper's browser calls it** from the Razorpay success `handler` (`frontend/app/(shop)/checkout/page.tsx:139-154`). `lib/checkout.ts:198-199` says: *"Money may be captured but we failed to record the order … the webhook (post-deploy) is the recovery path."* No such route exists.
- **Problem:** Razorpay (with auto-capture ON, as the playbook instructs) collects the customer's money during the popup. The order is created **after** that, only if the browser successfully posts back. There is no server-side source of truth.
- **Failure scenario:** Customer pays successfully → closes the tab / loses signal / browser crashes before/at the `handler` → **Razorpay has the money; your DB has no order, no `refund_required` row, nothing.** The customer is charged and sees no order; the owner has no record to reconcile or refund. This is a routine real-world event, not a rare edge.
- **Impact:** Direct, silent financial loss to customers and unaccounted revenue for the shop; support/chargeback exposure; reputational damage at launch. For a payments-live launch this is release-blocking.
- **Root cause:** Finalization is triggered by an untrusted, unreliable client instead of by the provider's server-to-server webhook.
- **Recommended remediation:** Implement `POST /api/payments/razorpay/webhook` that (1) verifies the `X-Razorpay-Signature` header HMAC against the **webhook secret** using the **raw request body** (mount `express.raw({type:'application/json'})` for this route *before* `express.json()`), (2) handles `payment.captured` by calling the existing `finalizePaidOrder` with the same idempotency key (`razorpayOrderId`) — the current idempotency logic already makes this safe to run twice, and (3) is itself idempotent against duplicate webhook deliveries. Register the webhook URL + secret in the Razorpay dashboard. Keep `/verify` as the fast path; the webhook becomes the guaranteed backstop. Also surface `refund_required` orders prominently in the Payments tab.
- **Verification criteria:** With auto-capture ON, pay and **kill the browser before verify** → within the webhook delivery window the order appears as paid (or `refund_required`) with no duplicate when `/verify` also later fires. Add an integration test that calls `finalizePaidOrder` twice with the same key and asserts one order.
- **Dependencies/caveats:** Needs a webhook secret env var and the raw-body middleware ordering. Interacts with F-10.

---

### [F-02] MongoDB Atlas network access open to the internet (`0.0.0.0/0`)

- **Category:** Security / Database / Config
- **Severity:** High · **Priority:** P1 · **Confidence:** High · **Status:** Partially verified
- **Location:** `playbook.md:25-26` ("Allow access from anywhere (`0.0.0.0/0`). *(We tighten this before launch.)*").
- **Affected component:** MongoDB Atlas cluster exposure.
- **Evidence:** The documented setup opens the cluster to all IPs. The live Atlas console was not inspected (hence *Partially verified*), but the project's own instructions set this state and the "tighten before launch" note is still outstanding.
- **Problem:** The database is reachable from any host on the internet. The only remaining barrier is the DB username/password (and the same credential string sits in `backend/.env`).
- **Failure scenario:** A leaked or weak credential (or a future credential-stuffing/`.env` exposure) becomes immediate full read/write to all customer data — no network-layer defence to slow it. Open Atlas clusters are also actively scanned and brute-forced.
- **Impact:** Catastrophic data exposure/tampering if credentials leak; higher baseline attack surface.
- **Root cause:** Dev convenience left in place; the pre-launch hardening step wasn't executed.
- **Recommended remediation:** Before launch, restrict Atlas Network Access to Render's egress IPs (or use Atlas private networking / VPC peering if available). Use a strong, unique DB user scoped to only the `raju-cycles` DB. Rotate the credential if it was ever shared. Confirm the `.env` is never committed (it isn't — only `.env.example` is tracked).
- **Verification criteria:** Atlas Network Access list contains only the production egress ranges; a connection from an unlisted IP is refused.
- **Dependencies/caveats:** Needs Render's outbound IP ranges (Render static-IP add-on may be required).

---

### [F-03] Test suite is non-deterministic and depends on a live shared Atlas database

- **Category:** Testing / QA
- **Severity:** High · **Priority:** P1 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/package.json` (`"test": "node … --test tests/**/*.test.ts"`), `backend/tests/setup.ts` (only sets `NODE_ENV=test`), `backend/tests/*.test.ts` (each `mongoose.connect(process.env.MONGODB_URI, { dbName: 'raju-cycles-test-*' })`). No `mongodb-memory-server` is installed.
- **Affected component:** The entire automated test suite.
- **Evidence I produced:**
  - Default `npm test` (parallel): **exit 1, 11 failing**, and the reported total **varied run to run** (32 then 40 subtests).
  - `npm test --test-concurrency=1` (serial): **exit 0, 68 pass / 0 fail / 1 skipped (69 total).**
  - `razorpay.test.ts` alone: **4/4 pass.**
- **Problem:** The DB-backed tests all hit **one shared live Atlas cluster**, and `node --test` runs files concurrently. Parallel execution causes contention/transaction conflicts that fail tests which pass serially — so the suite's result depends on timing, not code. It also **cannot run without network + a real Atlas credential**, and it writes to Atlas during every run.
- **Failure scenario:** CI (once added) would be red or flaky on correct code; developers learn to ignore it; a real regression hides in the noise. Tests also can't run offline or in an isolated CI runner without shipping Atlas secrets.
- **Impact:** The suite cannot reliably gate a release — undermining every "tests pass" claim.
- **Root cause:** No hermetic (self-contained) test database; reliance on a shared external cluster; default parallel runner.
- **Recommended remediation:** Make tests hermetic with `mongodb-memory-server` (spins up a throwaway in-process replica set, which also supports transactions), connect in a shared setup hook, and drop data between files. If staying on Atlas short-term, at minimum pin `--test-concurrency=1` in the `test` script so results are deterministic, and give each file a unique DB it drops on teardown. The *logic* is sound (serial run is green); this is about reliability and CI-fitness.
- **Verification criteria:** `npm test` passes deterministically across repeated runs with **no network/secrets**, exit 0 every time.
- **Dependencies/caveats:** Adding `mongodb-memory-server` is a dev-dependency change — needs owner authorisation per audit rules.

---

### [F-04] No CI pipeline — nothing automatically runs the checks before deploy

- **Category:** Infra / CI-CD / QA
- **Severity:** High · **Priority:** P1 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** No `.github/workflows`, no other CI config (`git ls-files` shows none); `playbook.md:131-136` lists the checks as **manual**.
- **Affected component:** Release process.
- **Evidence:** Repo has no workflow/pipeline files. Render/Vercel auto-deploy on push without a required check gate.
- **Problem:** Typecheck, tests, and `npm audit` are run by hand, if at all. A broken build or failing test can reach production because nothing blocks the deploy.
- **Failure scenario:** A push that breaks the typecheck or a money-path test deploys to the live shop unchallenged.
- **Impact:** Regressions reach production; the safety nets that exist (tests, typecheck) aren't enforced.
- **Recommended remediation:** Add a CI workflow that runs, on every PR and on `main`: backend typecheck + hermetic tests (after F-03), frontend typecheck + `next build`, and `npm audit --omit=dev` (or `--audit-level=high`) for both. Make it a required status check and enable branch protection on `main`. Gate Render/Vercel deploys on it.
- **Verification criteria:** A PR with a deliberate type error or failing test is blocked from merge/deploy.

---

### [F-05] Frontend dependency vulnerabilities (PostCSS high + moderate) via Next.js 15.1.0

- **Category:** Dependencies / Supply chain
- **Severity:** High (advisory rating) · **Priority:** P1 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `frontend/package.json` (`next@^15.1.0`), transitive `postcss`.
- **Evidence (my `npm audit` run):** `2 vulnerabilities (1 moderate, 1 high)` — PostCSS advisories GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q (+ follow-ups) for XSS-in-stringify and source-map path traversal/arbitrary `.map` read; pulled in by `next` ≤16.3.0. Backend `npm audit`: **0 vulnerabilities.**
- **Problem:** The installed Next.js train carries vulnerable PostCSS. `npm audit fix --force` wants `next@16` (a major, breaking bump). The PostCSS flaws are primarily **build-time/CSS-processing** issues (lower real-world runtime exploitability for a deployed app), but the finding is confirmed and Next 15.1.0 is also several patch releases behind current 15.x security fixes.
- **Failure scenario:** Build-time processing of attacker-influenced CSS, or exposure of source maps, under specific conditions; more importantly, running a known-behind framework version misses unrelated Next.js security patches.
- **Impact:** Elevated supply-chain risk; audit-gate failures.
- **Recommended remediation:** Bump to the **latest Next.js 15.x patch** first (`npm i next@^15` and re-audit) — this usually clears the transitive PostCSS advisory without a major migration. Only move to 16 deliberately, with its migration guide, if 15.x doesn't clear it. Re-run `npm audit` and fold it into CI (F-04). Do **not** run `--force` blindly.
- **Verification criteria:** `npm audit` in `frontend/` reports 0 high/critical; `next build` + typecheck still pass.
- **Dependencies/caveats:** Dependency upgrade needs owner authorisation per audit rules. Fetch current Next.js release notes before bumping.

---

### [F-06] No security headers on the API or the Next app

- **Category:** Security (defence in depth)
- **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/index.ts` (no `helmet` / header middleware); `frontend/next.config.ts` (an `images` CSP only, no app-level `headers()`).
- **Evidence:** No `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, or Referrer-Policy are set on API responses or app pages. The CSP in `next.config.ts` applies to the **image optimizer**, not the app.
- **Problem:** The admin panel (same Next app) can be framed (clickjacking); responses can be MIME-sniffed; HTTPS isn't pinned via HSTS.
- **Failure scenario:** An attacker frames `/admin` to trick a signed-in owner into clicking a disguised action; or a response is sniffed into an unintended content type.
- **Impact:** Moderate, mostly admin-facing; low likelihood but cheap to fix.
- **Recommended remediation:** Add `helmet()` to Express (sensible defaults), and a `headers()` block in `next.config.ts` setting `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and HSTS. Keep CORS as-is (single allow-listed origin, credentials — already correct).
- **Verification criteria:** Response headers present on API and app; `/admin` refuses to load in an iframe.

---

### [F-07] Rate limiting is in-memory and per-IP only; resets on restart, no account lockout

- **Category:** Security (abuse) / Resilience
- **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/lib/rateLimit.ts` (in-process `Map`, documented `ponytail:` single-instance); applied to login (10/15min) and checkout (30/10min).
- **Evidence:** Buckets live in one process's memory. Render restarts/deploys (and cold starts on idle) **reset all counters**. Limiting is purely per source IP; there's no per-account attempt counter or lockout.
- **Problem:** A determined attacker can reset the window by forcing/awaiting a restart, rotate IPs to sidestep per-IP limits, and there's no escalating backoff or lockout on a targeted account.
- **Failure scenario:** Credential-stuffing against the (known) owner email from many IPs; or brute-force that outlives short in-memory windows.
- **Impact:** Weakened brute-force protection on staff/customer login. Acceptable for a tiny single-instance shop, but worth hardening before a public launch.
- **Recommended remediation:** Keep the limiter, but add (a) a per-account failed-attempt counter with temporary lockout + email alert, and (b) if the API ever runs >1 instance, move counters to a shared store (the `ponytail:` note already says this). Consider a global login ceiling. Strong/unique staff passwords remain essential.
- **Verification criteria:** Repeated failures on one account lock it regardless of source IP; limits survive a process restart (if shared store adopted).

---

### [F-08] `/health` doesn't check the database — not a real readiness probe

- **Category:** Observability / Resilience
- **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/index.ts:49-51` (`res.json({ ok: true })`).
- **Evidence:** The health endpoint returns OK unconditionally, without verifying the Mongo connection state.
- **Problem:** An instance whose DB connection is down still reports healthy, so the platform keeps routing traffic to it; every request then 500s.
- **Failure scenario:** Atlas blip or connection drop → `/health` still green → users hit errors while the orchestrator believes the instance is fine.
- **Impact:** Slower outage detection and no automatic replacement of a degraded instance.
- **Recommended remediation:** Make `/health` (or a separate `/ready`) check `mongoose.connection.readyState === 1` and return 503 otherwise. Point Render's health check at it. Keep a lightweight `/health` liveness if preferred.
- **Verification criteria:** With the DB intentionally unreachable, the readiness endpoint returns non-200.

---

### [F-09] Storefront catalogue runs an uncached per-request `$lookup` aggregation, unthrottled

- **Category:** Performance / Scalability
- **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed (code); impact unmeasured · **Status:** Partially verified
- **Location:** `backend/src/routes/products.ts:23-69` (aggregation with a `$lookup` into `orders` to compute `soldCount`); no rate limit on public product routes; `lib/api.ts` fetches with `cache: 'no-store'`.
- **Evidence:** Every catalogue request runs an aggregation that, for each matched product, looks up and unwinds order items to sum sold units (the code's own `ponytail:` note: "O(products × order-items) — fine for a small shop"). The frontend disables caching for freshness, so each page view hits it. Public routes have no rate limiter.
- **Problem:** Cost grows with catalogue size × order history and is paid on every uncached request; a scraper or small traffic spike hits the DB hard with no throttle.
- **Failure scenario:** As orders accumulate (or a bot crawls `/shop`), aggregation latency and Atlas load climb; the free/low tier can saturate.
- **Impact:** Degraded storefront latency and DB pressure under growth/abuse. Not an immediate blocker at launch volume.
- **Recommended remediation:** The code already names the upgrade path: denormalise `soldCount` onto the product and `$inc` it on delivery, then sort on the stored field (drop the `$lookup`). Add a light rate limit to public catalogue routes, and a short CDN/`s-maxage` cache for the "popular" sort where perfect freshness isn't required (price/stock still recompute on the product page and at checkout, so staleness here is cosmetic). Measure before/after.
- **Verification criteria:** Catalogue p95 latency stays flat as order volume grows; a load test shows the route holding under expected peak.

---

### [F-10] `authorized`-but-not-`captured` Razorpay payments are abandoned (funds held, no record)

- **Category:** Correctness (payments) / Resilience
- **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/routes/checkout.ts:152-161`.
- **Evidence:** If `payment.status !== 'captured'` (e.g. `authorized` because dashboard auto-capture is off), verify returns 409 "try again" and records nothing. `createRazorpayOrder` (`lib/razorpay.ts:46-59`) does **not** send `payment_capture`, so capture depends entirely on the dashboard setting the playbook tells the owner to enable.
- **Problem:** With auto-capture off (or a timing where the payment is authorised but not yet captured), the customer's funds are held by the bank, but the app neither captures nor records the attempt.
- **Failure scenario:** Dashboard misconfiguration (auto-capture off) → every online payment authorises, the app 409s, funds sit blocked on customers' cards until auto-released, and the shop makes no sales — silently.
- **Impact:** Lost sales + held customer funds + confusion; fully dependent on an out-of-band dashboard toggle.
- **Recommended remediation:** Make capture explicit and not dashboard-dependent — either pass `payment_capture: 1` when creating the order, or, in verify, **capture the authorised payment server-side** before finalizing. Treat `authorized` as a state to act on, not to abandon. Combine with the F-01 webhook so `payment.authorized`/`payment.captured` events are handled server-side.
- **Verification criteria:** With auto-capture off, an online payment still results in a captured, recorded order (or an explicit, logged failure), never a silent hold.

---

### [F-11] `adjustStock` audit before/after can be inaccurate under concurrent manual adjustments

- **Category:** Correctness (audit trail)
- **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/lib/inventory.ts:19-46`.
- **Evidence:** `before` is read in a separate query from the atomic `$inc`, and the movement record is written after, **not in a transaction**. The stock value itself is safe (`$inc` is atomic and guarded against going negative), but two concurrent adjusts can both read the same `before` and write movement rows with wrong before/after figures; a crash between `$inc` and movement-create leaves stock changed with no audit row.
- **Impact:** Stock integrity is fine; the **movement history** (an audit artifact) can be misleading under rare concurrency. For a single-operator shop this is near-zero probability.
- **Recommended remediation:** Wrap the read + `$inc` + movement insert in a transaction (as checkout and cancel already do), or compute before/after from the update's returned document. Low urgency.
- **Verification criteria:** Concurrent adjusts produce movement rows whose before/after are internally consistent.

---

### [F-12] Guest cart/order cookie is unsigned

- **Category:** Security
- **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/lib/guest.ts:26-52` (plain `guest:<uuid>` in an httpOnly cookie; owner only checked for the `guest:` prefix).
- **Evidence:** The guest identity is a client-held value; carts and `GET /api/orders` are scoped to it. It's not signed/HMAC'd, but it's a random UUID v4 (unguessable) and httpOnly.
- **Problem:** Anyone who learns another shopper's guest UUID could set it as their cookie and read that cart/order history. Guessing it is infeasible.
- **Impact:** Low — depends on a UUID leaking (logs, shared device). No price/stock trust is placed in it.
- **Recommended remediation:** Optional: sign the cookie (the app already has `SESSION_SECRET`) or move guests onto the existing session store. Acceptable to accept the risk for MVP; don't log the cookie value.
- **Verification criteria:** A tampered/forged guest cookie can't access another owner's data (if signing adopted).

---

### [F-13] Documentation drift (stale test counts; "React" wording)

- **Category:** Documentation
- **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `playbook.md:134,150,174,181` (says "26 tests" / "23/23" / "30 tests" / "37 tests"); `00-overview.md:113` already flags leftover "React" wording.
- **Evidence:** Actual serial run = **69 subtests across 17 files**. The playbook's counts are each out of date and inconsistent with each other.
- **Impact:** Minor confusion; erodes trust in the docs.
- **Recommended remediation:** Replace fixed counts with "run `npm test`" or update once tests are hermetic (F-03). Finish the overview's pending "React → Next.js" wording refresh.

---

### [F-14] `computeTotals` ignores settings; a future shipping/tax value wouldn't apply

- **Category:** Correctness (forward-looking)
- **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/lib/pricing.ts:12-18` (discount/shipping/tax hard-coded to 0); `models/settings.ts` has **no** shipping/tax fields.
- **Evidence:** Totals are always `subtotal`. The settings document doesn't carry shipping/tax yet, so there's no live gap today — but the `ponytail:` note says these "become the settings document in build step 6."
- **Impact:** None currently (MVP is free shipping, no tax). Flagged so that when shipping/tax settings are added, `computeTotals` and the order schema must be updated together.
- **Recommended remediation:** When shipping/tax are introduced, drive them from settings and recompute server-side; add a test. No action needed now.

---

### [F-15] No 404 handler for unknown API routes; idempotency index migration note

- **Category:** API contract / Database
- **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/index.ts:69-75` (error handler only, no final 404); `models/order.ts:75-80` (compound unique index + `ponytail:` note about dropping any old single-field `idempotencyKey` index).
- **Evidence:** An unknown path falls through to Express's default. Separately, the order model's comment warns that a pre-existing single-field unique index on `idempotencyKey` must be dropped by hand (Mongoose won't remove it).
- **Impact:** Inconsistent 404 body for unknown routes (cosmetic). The index note is an **operational migration risk**: if an old index lingers, two different shoppers reusing a client-chosen key could collide.
- **Recommended remediation:** Add a final `app.use((req,res)=>res.status(404).json({error:{message:'Not found.'}}))`. Before launch, verify in Atlas that the only `idempotencyKey` index is the compound `{owner,idempotencyKey}` unique one; drop any legacy single-field index.
- **Verification criteria:** Unknown route returns the standard JSON 404; `db.orders.getIndexes()` shows only the intended indexes.

---

### [F-16] Single-settings-doc `findOne()` has no stable key

- **Category:** Database (informational)
- **Severity:** Informational · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/routes/settings.ts`, `routes/admin.ts` settings/category handlers, `models/settings.ts` (all `findOne()` / `findOneAndUpdate({}, …)`).
- **Evidence:** The "one settings document" is addressed by `findOne()` with no fixed id. If two settings docs ever exist (e.g. a race on first upsert), reads/writes could target different ones nondeterministically.
- **Impact:** None observed; purely a latent consistency risk.
- **Recommended remediation:** Pin the doc to a known `_id` (e.g. a constant key) or add a unique singleton guard. Low urgency.

---

### [F-17] Order-confirmation email is fire-and-forget; silent no-receipt on send failure

- **Category:** Resilience (informational, by design)
- **Severity:** Informational · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/src/lib/email.ts:16-60`, `lib/checkout.ts:16-24` (`void sendOrderConfirmation`).
- **Evidence:** Email never throws into the request path (deliberate — a mail failure must not fail a paid order). Failures are logged (`[mail]`) and swallowed; no retry/queue.
- **Impact:** A customer may not get a receipt email if Resend fails; the order is still placed and visible in the account. This is a sensible trade-off, documented here for completeness.
- **Recommended remediation:** Optional: a small retry or a "resend receipt" admin action. No launch action required.

---

### [F-18] Node engine/runtime drift — pin the production runtime

- **Category:** Config / Infra (informational)
- **Severity:** Informational · **Priority:** P3 · **Confidence:** Confirmed · **Status:** Verified
- **Location:** `backend/package.json` (`engines.node >= 20`); local runtime observed as **v24.11.0**.
- **Evidence:** The app relies on modern Node built-ins (`process.loadEnvFile`, `node --test`, `node:crypto` HMAC/timing-safe). `engines` allows any ≥20; the actual local run was v24.
- **Impact:** Behaviour differences between dev (v24) and whatever Render pins could surface subtly (e.g. `loadEnvFile` availability). Low.
- **Recommended remediation:** Pin an exact LTS major in Render (and ideally an `.nvmrc` / tightened `engines`) so dev, CI, and prod match.

---

## 10. Security Assessment

**Strengths (verified in code):**
- **Server is the authority** on price, total, and stock everywhere; the client is never trusted for money.
- **Passwords:** bcrypt (cost 10) for staff and customers; **constant-time login** via a dummy-hash compare to defeat email enumeration (`auth.ts`, `account.ts`).
- **Email tokens** (verify/reset) stored **sha256-hashed**, raw token only in the emailed link; sensible TTLs (24h verify, 1h reset); forgot-password gives a uniform response (no enumeration).
- **Razorpay signature** verified with HMAC-SHA256 and **`timingSafeEqual`** with a length guard (`razorpay.ts`).
- **Injection:** all bodies pass Zod `safeParse`; query params are `typeof === 'string'`-guarded (blocks `?x[$ne]=` object injection); regex search inputs run through `escapeRegex`; ids checked with `isValidObjectId`.
- **RBAC** enforced server-side on every admin route; client gating is cosmetic only.
- **Cookies:** httpOnly; `SameSite=None; Secure` in prod (correct for cross-site Vercel↔Render); `trust proxy` set; sessions in Mongo (survive restarts); 7-day expiry.
- **Secrets:** none committed (`.env` gitignored; only `.env.example` tracked); prod guard rejects the default/weak `SESSION_SECRET`; Razorpay **secret** never leaves the server (only the public key id reaches the browser).

**Gaps:** F-01 (payment recording), F-02 (Atlas exposure), F-05 (deps), F-06 (headers), F-07 (rate-limit/lockout), F-12 (unsigned guest cookie). No audit log for sensitive admin actions beyond `[pay]`/structured logs (consider an audit trail for payment-status and settings changes — informational).

---

## 11. Correctness and Data Integrity Assessment

**Strong.** The three dangerous paths — checkout, cancel-restock, stock-adjust — all use MongoDB transactions with **atomic guarded updates** (`$elemMatch` + positional `$` so the stock/qty guard and the decrement hit the same variant). Overselling is prevented (matchedCount===0 → abort); double-charge/double-order is prevented by the pre-check + compound unique `{owner, idempotencyKey}` index + dup-key race handling; cancel restores stock exactly once via a state-guarded transition. Money is integer paise end-to-end (no floats); order items are **snapshotted** so later price/product edits don't rewrite history. Pagination sorts carry an `_id` tiebreaker for stable paging.

**Caveats:** F-01 (the one place correctness breaks for online pay — recording depends on the browser), F-10 (authorized-not-captured), F-11 (audit-row concurrency), F-15 (index migration), F-16 (settings singleton).

---

## 12. Performance and Scalability Assessment

Appropriate for a single-shop MVP on modest hosting. Indexes exist for the hot order queries (owner+createdAt, createdAt, fulfilment+createdAt, payment+createdAt) and unique indexes on product slug, staff/customer email. Mongoose pools the connection.

**Watch items:** F-09 (uncached per-request `$lookup` on the catalogue, unthrottled public routes) is the main scalability ceiling; admin search uses unanchored case-insensitive regex (collection scan) — fine at shop scale, not at catalogue-of-thousands. The 3D hero stack (`three` + three `@react-three/*` packages + `gsap` + `postprocessing`) is a **large client bundle**; verify initial-load performance on low-end mobile (the shop's likely audience) — not measured here (no load/bundle analysis run).

---

## 13. Testing and Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Backend typecheck | `npm run typecheck` (backend) | **PASS** (exit 0) |
| Frontend typecheck | `npm run typecheck` (frontend) | **PASS** (exit 0) |
| Backend tests (parallel/default) | `npm test` | **FAIL** (exit 1, 11 failing, count varies) |
| Backend tests (serial) | `npm test --test-concurrency=1` | **PASS** (68 pass / 0 fail / 1 skipped) |
| Backend deps | `npm audit` | **0 vulnerabilities** |
| Frontend deps | `npm audit` | **2 (1 high, 1 moderate)** |
| Frontend build | `next build` | **NOT RUN** (see §19) |

**Coverage quality:** the serial pass shows meaningful tests — checkout safety, finalize-paid (incl. refund paths), cancel-restock, adjust guards, permissions, pagination, product input/query, note input, rate-limit, Razorpay signature, admin + account flows. These assert real outcomes, not just "no throw." The **reliability** of the suite is the problem (F-03), not its intent. Gaps: no webhook test (because no webhook — F-01), no frontend tests, no end-to-end/browser tests in the repo (a `.playwright-mcp/` scratch folder exists but is not a committed suite).

---

## 14. Dependency and Supply-Chain Assessment

- **Backend:** lean and clean — `express`, `mongoose`, `zod`, `bcryptjs`, `cors`, `express-session`, `connect-mongo`. `npm audit`: **0 vulnerabilities.** Zero-SDK Razorpay (raw `fetch` + `node:crypto`) avoids a dependency — appropriate.
- **Frontend:** heavier (3D stack). `npm audit`: **1 high + 1 moderate** in transitive PostCSS via Next 15.1.0 (F-05). Next 15.1.0 is also behind current 15.x patches.
- **Lockfiles** present for both. No obviously unused/abandoned direct deps on the backend. No install-script or provenance review was performed beyond `npm audit` (mark as partially verified for supply chain).

---

## 15. Infrastructure and Deployment Assessment

- **Targets:** Express → Render; Next.js → Vercel; MongoDB → Atlas. Documented in `playbook.md`.
- **No IaC / no Dockerfile / no `render.yaml` / `vercel.json`** committed — deploys rely on platform auto-detection. Acceptable for these PaaS hosts, but there's **no documented rollback, migration sequencing, or smoke-test** procedure.
- **Graceful shutdown is implemented** (`index.ts`: SIGTERM/SIGINT drain + DB disconnect + forced-exit timeout) — good for Render's deploy restarts. Keep-alive/headers/request timeouts are tuned.
- **Health check exists but is shallow** (F-08). **No CI gate** (F-04). **Atlas open to the internet** (F-02).
- **Config validation at boot** is a real strength: `config.ts` fails fast on missing/invalid env and rejects a weak prod `SESSION_SECRET`.

---

## 16. Observability and Operational Readiness

- **Structured-ish logging** via a `logger('pay')`/`[mail]` wrapper; payment flow logs key events (create/verify/refund-required) with ids. Errors hit a last-resort handler that logs the real error and returns a generic message (no stack/secret leakage to clients). `unhandledRejection`/`uncaughtException` log and exit so the host restarts clean.
- **Missing:** request/correlation ids, metrics (error rate, latency), alerting, dashboards, queue/pool telemetry, and an **audit trail** for sensitive admin actions (payment-status changes, settings edits, stock adjusts record an actor + reason — partial audit exists for inventory/orders, good). Health/readiness is shallow (F-08).
- For a shop this size, the gaps are acceptable post-launch, but at minimum add a readiness probe and a way to be alerted on `refund_required` orders and on `[pay] verify: unexpected error` (the F-01 recovery signal).

---

## 17. AI-Specific Assessment

**N/A.** The system uses no LLMs, agents, RAG, embeddings, model-generated outputs, or tool-calling. Section V of the audit brief does not apply. (A `graphify-out/` folder exists in the repo as a developer code-navigation artifact; it is not part of the application and is gitignored.)

---

## 18. Missing Controls and Unimplemented Safeguards

- **Razorpay webhook** (the server-side source of truth for payments) — **missing** (F-01).
- **CI gate / branch protection** — missing (F-04).
- **Hermetic test database** — missing; tests need live Atlas (F-03).
- **Security headers / helmet** — missing (F-06).
- **Account lockout / shared rate-limit store** — missing (F-07).
- **DB-aware readiness probe** — missing (F-08).
- **Atlas network restriction** — not yet applied (F-02).
- **Backup/restore procedure + evidence** — not documented (Atlas has automated snapshots on paid tiers; the free M0 tier does **not** — confirm the tier and backup policy before launch). *Unverified.*
- **Rollback/migration/smoke-test runbook** — not documented (§15).
- **Audit trail for payment-status & settings changes** — partial (inventory/orders record actor; payments log but there's no immutable trail).

---

## 19. Checks Not Completed and Why

- **`next build` (frontend production build)** — not run. The "one dev server only" constraint and the risk of colliding with a running `next dev` made me avoid it in this pass; typecheck passed, but a full build + bundle-size measurement is **unverified**. *Run `next build` with no dev server active.*
- **Live Razorpay end-to-end** — not exercised (no live keys / no real payments per audit rules). F-01/F-10 are code-verified, not reproduced against the provider.
- **Live Atlas network config & tier/backup policy** — read from `playbook.md`, not inspected in the Atlas console (F-02, §18). *Partially verified.*
- **Load / performance measurement** — not run; F-09 and bundle size are code-derived concerns, not measured.
- **Render/Vercel console review** (env vars set in prod, health-check wiring, egress IPs) — out of reach from the repo.
- **Deep supply-chain** (install scripts, provenance) — only `npm audit` was run.

---

## 20. Prioritized Remediation Roadmap

**Stage 1 — Release blockers (do before a payments-live launch)**
1. **F-01** Build + verify the Razorpay webhook (raw-body HMAC, idempotent `finalizePaidOrder`, dashboard registration). *Blocks launch.*
2. **F-10** Make capture explicit (`payment_capture: 1` or server-side capture) so online pay never silently holds funds. *Pairs with F-01.*

**Stage 2 — Required production safeguards (before launch unless formally accepted)**
3. **F-02** Restrict Atlas network access to prod egress; rotate/scope the DB user.
4. **F-03** Make tests hermetic (`mongodb-memory-server`) or at least pin serial; then
5. **F-04** add a CI workflow (typecheck + tests + build + audit) as a required gate.
6. **F-05** Bump to latest Next.js 15.x; re-audit to clear PostCSS.
7. **F-06** Add helmet + Next security headers.

**Stage 3 — Reliability & performance (soon after launch)**
8. **F-08** DB-aware readiness probe + alert on `refund_required` / verify errors.
9. **F-07** Account lockout; shared rate-limit store if scaling past one instance.
10. **F-09** Denormalise `soldCount`; add public-route throttle + light cache; measure.
11. **§18** Confirm Atlas tier/backup policy; write a rollback/restore runbook.

**Stage 4 — Maintainability & quality (backlog)**
12. **F-11, F-13, F-14, F-15, F-16, F-17, F-18** — audit-row transaction, doc-count refresh, settings-driven totals (when added), 404 handler + index check, settings singleton key, receipt retry/resend, pin Node runtime.

Each item lists the finding IDs it addresses; verification steps are in each finding's "Verification criteria."

---

## 21. Production Release Gate Checklist

Launch mode assumed: **Razorpay live.** Mark result at sign-off.

- [ ] **FAIL** — Critical & P0 findings resolved (F-01 open).
- [ ] **FAIL** — P1 findings resolved or formally accepted (F-02, F-03, F-04, F-05 open).
- [x] **PASS** — Authentication & authorization verified (bcrypt, constant-time, RBAC server-side).
- [x] **PASS** — Input validation & data-integrity controls verified (Zod + transactions + guards).
- [ ] **NOT VERIFIED** — Critical business workflows tested *in CI/hermetically* (serial pass only; F-03).
- [ ] **NOT VERIFIED** — DB constraints & migration safety reviewed (confirm no legacy idempotency index — F-15).
- [x] **PASS** — Secrets & prod config checked (no committed secrets; boot-time validation; prod secret guard).
- [x] **PASS (partial)** — Dependency checks completed to available level (backend clean; frontend 2 open — F-05).
- [ ] **FAIL** — Error handling & recovery paths tested (payment recovery path absent — F-01).
- [x] **PASS** — Idempotency & concurrency assessed (strong; see §11; F-11 minor).
- [ ] **NOT VERIFIED** — Performance & capacity risks assessed (F-09 code-only; no load test).
- [ ] **FAIL** — Required automated checks pass in CI (no CI — F-04).
- [ ] **FAIL** — Logging/monitoring/health/alerts verified (shallow health, no alerts — F-08).
- [ ] **NOT VERIFIED** — Backup & recovery requirements addressed (tier/backup unconfirmed — §18).
- [ ] **NOT VERIFIED** — Deployment & rollback procedures reviewed (undocumented — §15).
- [ ] **PENDING** — Residual risks & exceptions documented (this report).
- [ ] **PENDING** — Required release approvals obtained (owner).

---

## 22. Residual Risks and Explicit Assumptions

- **Assumption:** Razorpay auto-capture behaviour and dashboard config are as the playbook instructs; not verified live (F-01/F-10 rest on this).
- **Assumption:** The live Atlas network list still reflects `0.0.0.0/0` as documented; not inspected (F-02).
- **Residual:** Even with F-01 fixed, webhook delivery can lag or retry; the `refund_required` safety net and manual reconciliation remain the backstop — monitor it.
- **Residual:** Single-instance assumptions (in-memory rate limit) are fine only while the API runs one instance; scaling out silently weakens F-07.
- **Residual:** Frontend build/bundle performance on low-end mobile is unmeasured (3D stack).
- **Not a compliance opinion:** PII handling (names, phones, addresses, emails) looks reasonable and access-controlled, but this report does **not** assert legal/DPDP (India Digital Personal Data Protection) compliance — that needs organisational/legal confirmation. No data-export/delete-account flow exists (consider for privacy requests).

This verdict reflects the reviewed scope and the evidence gathered; it is not a guarantee of zero defects. "NOT VERIFIED" items are gaps in verification, not passes.

---

## 23. Appendix: Commands Executed and Results

All run read-only from the repo root or app subdirectories; no live external systems touched.

```text
backend$  npm run typecheck                         → exit 0 (pass)
frontend$ npm run typecheck                         → exit 0 (pass)
backend$  npm test                                  → exit 1; parallel: 11 failing (count varied 32→40 subtests)
backend$  node --import tsx --import ./tests/setup.ts --test tests/razorpay.test.ts
                                                     → 4 pass / 0 fail (unit, isolated)
backend$  node … --test --test-concurrency=1 tests/**/*.test.ts
                                                     → 69 total: 68 pass / 0 fail / 1 skipped (serial)
backend$  npm audit                                 → found 0 vulnerabilities
frontend$ npm audit                                 → 2 vulnerabilities (1 moderate, 1 high) — PostCSS via next@15.1.0
repo$     git ls-files | grep -E '\.env'            → backend/.env.example, frontend/.env.example (no real .env tracked)
repo$     (check CI / Docker / deploy config)       → none (.github/workflows absent; no Dockerfile/render.yaml/vercel.json)
repo$     node -v                                   → v24.11.0 (engines: >=20)
```

**Root-cause note:** the 11 parallel test "failures" share **one** root cause — concurrent file execution against a single shared live Atlas cluster — not 11 separate bugs. The serial pass (68/68) confirms the logic is sound; the finding is reliability/hermeticity (F-03), consolidated as one.

---

*Report generated by an evidence-based read-only audit on 2026-10-21. No application code was modified. Re-run the checks in §23 (plus `next build` and a live Razorpay/Atlas review) after remediation to move the verdict toward `CONDITIONALLY READY`.*
