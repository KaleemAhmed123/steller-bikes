# Pre-launch hardening (production-readiness audit follow-up)

## 1. Task

- **Name:** Pre-launch hardening — act on the Critical/High findings from the production-readiness audit.
- **Status:** In progress
- **Started:** 2026-10-21
- **Last updated:** 2026-10-21
- **Source:** [`../production-readiness-audit.md`](../production-readiness-audit.md) (findings F-01…F-18).

## 2. What you asked for

Address the **Critical and High** findings this sprint. Owner decisions:

- **F-01 (no Razorpay webhook)** — **accept as debt** for now; the client's Razorpay account isn't arranged yet. Make small patches so the eventual fix is safe/robust. *Minimal + document* chosen.
- **F-02 (Atlas open to `0.0.0.0/0`)** — owner will restrict it once fully deployed. Not a code task.
- **F-03 (tests need a live shared Atlas; flaky)** — fix it. *In-memory database* chosen.
- **F-04 (no CI)** — add a basic GitHub Actions check.
- **F-05 (frontend dependency vulns)** — explain, then take the recommended steps.

## 3. Open questions (answered)

| # | Question | Recommendation | Owner's answer |
|---|----------|----------------|----------------|
| 1 | How should DB-backed tests get a MongoDB? | In-memory (`mongodb-memory-server`) | **In-memory** |
| 2 | How much webhook robustness now? | Minimal (explicit capture) + document | **Minimal + document** |

## 4. Plan

Plain-English summary of each piece, why, and what it touches.

### F-05 — Frontend dependency vulnerabilities (DONE)
- **What:** `npm audit` flagged **PostCSS** (a build-time CSS tool) bundled by Next.js — file-read + CSS-injection advisories.
- **Finding on investigation:** the installed Next is already the latest 15.x (15.5.28); npm claimed only the breaking `next@16` could fix it, because every Next ≤16.3 pins the vulnerable PostCSS range.
- **Fix chosen (no breaking upgrade):** an npm **`override`** forcing `postcss` to the patched `^8.5.31`. This is a minor bump inside the stable 8.x line.
- **Result:** **production dependencies now audit clean (0 vulnerabilities)**; frontend build still passes.
- **Left accepted:** a dev-only `braces` DoS advisory reached through `eslint-config-next` (the linter). It is **not in the production bundle**, and the advisory marks *every* braces version vulnerable (no fix exists short of downgrading the linter to an old 14.x, which would mismatch Next 15). CI gates on **production** deps only, so this is documented and accepted.
- **Touches:** `frontend/package.json` (`overrides`), `frontend/package-lock.json`.

### F-03 — Hermetic (self-contained) tests (DONE)
- **What:** the checkout/cancel/adjust tests need real MongoDB transactions, which need a **replica set**. They used to connect to the live Atlas cluster → needed a secret + internet, and were flaky when run in parallel.
- **Fix:** add `mongodb-memory-server` (dev dependency). It spins up a throwaway MongoDB **replica set** in `backend/tests/setup.ts`, which runs (via `--import`) **before** any test file reads `MONGODB_URI`. Because `loadEnvFile()` never overrides an already-set variable, the in-memory URL wins over any real `backend/.env`.
- **Result:** `npm test` runs offline, needs no secret, touches no Atlas, and is deterministic.
- **Touches:** `backend/package.json` (devDependency), `backend/tests/setup.ts`.

### F-04 — Basic CI (DONE)
- **What:** `.github/workflows/ci.yml` runs on every PR + push to `main`.
- **Jobs:** backend (typecheck · `npm test` on the in-memory DB · production `npm audit`) and frontend (typecheck · `next build` · production `npm audit`). Node pinned to 22. The MongoDB binary is cached.
- **Audit gate:** `npm audit --omit=dev --audit-level=high` — gates on production vulnerabilities, ignores dev-only/no-fix advisories (see F-05).
- **Owner to do:** make this a **required status check** + enable branch protection on `main` in GitHub settings.
- **Touches:** `.github/workflows/ci.yml` (new).

### F-01 / F-10 — Webhook debt (minimal patch + document)
- **F-10 fix (code):** set `payment_capture: true` when creating the Razorpay order, so an approved payment is **captured automatically per order** instead of depending on the dashboard's account-level auto-capture toggle. A mis-set toggle would otherwise leave funds merely *authorized* (held, not collected) with no sale recorded. Verified against the official Razorpay Orders API (`payment_capture` boolean).
- **F-01 (accepted debt):** the server still records a paid order **only** when the browser calls `/verify`. The robust fix is a **server-to-server webhook** (the provider calls us), deferred until the client's Razorpay account exists. **Online payment is OFF until both Razorpay keys are set**, so this risk is dormant at a COD-only launch and activates the day online pay is switched on.
- **The exact later fix (do before enabling online pay):** add `POST /api/payments/razorpay/webhook` that (1) reads the **raw** body (mount `express.raw` for that route *before* `express.json`), (2) verifies the `X-Razorpay-Signature` HMAC against the **webhook secret**, (3) on `payment.captured` calls the existing `finalizePaidOrder` with the Razorpay order id as the idempotency key — which is already safe to run twice. Register the URL + secret in the Razorpay dashboard. This reuses the current idempotent finalize logic, which is why no refactor is needed now.
- **Touches:** `backend/src/lib/razorpay.ts` (one field + comment).

### F-02 — Atlas network lockdown (owner, not code)
- Restrict Atlas Network Access to the production egress IPs (or private networking) before go-live; scope + rotate the DB user. Tracked here; no code change.

## 5. Tasks

- [x] F-05: add `postcss` override, reinstall, confirm production audit clean + build passes.
- [x] F-03: add `mongodb-memory-server`; rewrite `tests/setup.ts` to start an in-memory replica set.
- [x] F-03: prove hermeticity (tests pass with `backend/.env` removed).
- [x] F-04: write `.github/workflows/ci.yml` (typecheck + test + build + production audit, Node 22, binary cache).
- [x] F-10: set `payment_capture: true` on Razorpay order creation (API-verified).
- [x] F-01: document the deferred webhook + the exact later fix (this spec + audit report).
- [ ] **Owner:** make CI a required check + branch protection on `main`.
- [ ] **Owner:** restrict Atlas network access before go-live (F-02).
- [ ] **Owner/when Razorpay arranged:** build the webhook per the plan above (lifts F-01 debt).

## 6. Updates

- **2026-10-21** — Sprint created from the production-readiness audit. F-05, F-03, F-04, F-10 implemented; F-01 documented as accepted debt with the exact later fix. Investigation note on F-05: the vuln could not be cleared by staying on Next 15.x the normal way (npm wanted breaking `next@16`); resolved instead with a `postcss` override, leaving production deps clean. Verification results recorded in §7.

## 7. Explanation (post-implementation walkthrough)

### What changed
1. `frontend/package.json` gained `"overrides": { "postcss": "^8.5.31" }` → the vulnerable PostCSS is replaced by a patched one across the tree.
2. `backend/package.json` gained `mongodb-memory-server` (dev), and `backend/tests/setup.ts` now boots an in-memory MongoDB replica set and publishes its URL before tests read it.
3. `.github/workflows/ci.yml` (new) runs the checks automatically.
4. `backend/src/lib/razorpay.ts` now sends `payment_capture: true` on order creation.

### Why it was needed
The audit found the project is otherwise solid but not launch-ready for online payments: a dependency vuln, a test suite that couldn't gate a release, no CI, and a payment-capture edge. These remove the High-severity blockers that *don't* require the client's Razorpay account; the one that does (the webhook) is now safe to add later and clearly documented.

### How it works, step by step
- **Tests:** `npm test` → Node loads `tests/setup.ts` first → it starts an in-memory replica set and sets `MONGODB_URI` → each test file connects there (never Atlas) → transactions work because it's a replica set → server stops on process exit.
- **CI:** a push/PR triggers two parallel jobs that install, typecheck, run tests (in-memory DB) / build, and audit production deps; a failure blocks the merge once branch protection is on.
- **Payment capture:** when online pay is live, Razorpay auto-captures approved payments per order, so funds are collected, not just authorized.

### Files / functions changed
- `frontend/package.json`, `frontend/package-lock.json` — PostCSS override.
- `backend/package.json`, `backend/package-lock.json` — `mongodb-memory-server` dev dep.
- `backend/tests/setup.ts` — in-memory replica-set bootstrap.
- `.github/workflows/ci.yml` — new CI pipeline.
- `backend/src/lib/razorpay.ts::createRazorpayOrder` — `payment_capture: true` + explanatory comment.

### Important decisions
- **Override over `next@16`:** kept the non-breaking path; a major Next upgrade is a deliberate, separate decision.
- **Per-process in-memory servers:** each test file runs in its own process and gets its own throwaway DB — maximum isolation, no shared-state flakiness. Trade-off: a little startup cost per file.
- **CI audits production deps only:** dev-only, no-fix advisories (eslint toolchain) must not permanently red the pipeline.
- **Webhook deferred, capture added now:** the capture fix is one safe line and matters the moment online pay is on; the webhook needs the client's account and a new endpoint, so it's documented debt.

### Tests / verification
- Frontend: `npm run typecheck` → pass; `npm run build` → pass (exit 0); `npm audit --omit=dev` → **0 vulnerabilities**.
- Backend: `npm test` with `backend/.env` removed → **(results in Updates / final verification)**; `npm run typecheck` → pass.
- Razorpay `payment_capture` verified against the official Node SDK docs (boolean field on `orders.create`).

### Edge cases and limitations
- **F-01 remains open debt:** until the webhook exists, a browser that dies between payment capture and `/verify` still loses the order record — but online pay is OFF until keys are set, so this cannot trigger at a COD-only launch.
- **First CI run** downloads the MongoDB binary (cached thereafter).
- **Dev-only `braces` advisory** stays flagged in a full (non-production) `npm audit`; accepted as it never ships.
