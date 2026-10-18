# Build Step 5 — Admin (staff login, orders + inventory)

**Status:** Shipped (code level; logic + auth-gating verified) · **Started:** 2026-10-16 ·
**Last updated:** 2026-10-16

> The owner's back-office. Staff log in, work the order queue through its fulfillment states, and
> adjust stock — every action permission-gated. Logic ported from v1 (`lib/domain.ts`,
> `lib/server/orders.ts`, `admin.ts`); v1's dead template code and platform auth are left behind.

## 1. Task

A permission-gated admin: email+password staff login, an orders screen with the full fulfillment
state machine, an inventory screen with stock adjust + movement history, and a light dashboard.

## 2. What you asked for

- Build **step 5 only, fully autonomous** (plan → build → test → docs → one final report, no pauses).
- Carry v1's **logic** (state machine, cancel-restock, inventory movements, RBAC), **ignore** its
  dead components/files to avoid context bloat.
- Save docs + memory + a continuation prompt, then build.

## 3. Grill outcomes — answered 2026-10-16

| # | Question | Answer |
|---|----------|--------|
| 1 | Autonomy / scope | **Step 5 only, fully autonomous.** |
| 2 | Roles | **Owner + Manager.** Owner = all; Manager = orders + inventory + dashboard (no staff/settings). |
| 3 | First owner | **Seed script from env** (`STAFF_EMAIL`/`STAFF_PASSWORD`/`STAFF_ROLE`). |
| 4 | Admin screens | **Orders, Inventory, light Dashboard** (no audit-log view). |
| 5 | Fulfillment | **Full v1 state machine**; tracking required to ship; cancel restores stock once. |
| 6 | Orders UI | **List + status filter + search + detail view.** |
| 7 | Stock history | **Retrofit checkout to log sale movements** → every stock change recorded. |
| 8 | Session | **7-day, Mongo-backed** (survives Render restarts); bcrypt; no lockout. |
| 9 | Scope creep | **None** — returns/coupons/email/customer-history all stay later-phase. |
| 10 | Admin look | **Functional dense tables, same theme**, no component library. |
| 11 | Staff creation | **Seed script / CLI**, no in-app staff screen. |
| 12 | Demo data | **Seed a few labelled demo orders.** |

Defaults taken: admin lives in the **same Next.js app** under `/admin`, behind a client auth guard;
frontend split into `(shop)` and `admin` route groups so admin doesn't inherit the shop header;
`bcryptjs` (pure-JS, no native build on Windows/Render); admin session cookie is cross-site
(`SameSite=None; Secure` in prod), same pattern as the cart.

## 4. Plan

**Backend:**
- Models: `staff` (email, passwordHash, role, active), `inventoryMovement` (variantId, actor, reason,
  before, after). Order model already exists.
- `lib/permissions.ts` — permission list + `ROLE_PERMISSIONS` (owner/manager) + `can(role, perm)`.
- `lib/fulfillment.ts` — transitions map + `allowTransition` + `transitionOrder` (transaction:
  guarded status update; on cancel, restore stock once + log movements).
- `lib/inventory.ts` — `adjustStock` (guarded `$inc`, can't go negative, logs a movement).
- Retrofit `lib/checkout.ts` — log a `Sale <orderId>` movement per item inside the existing tx.
- Auth: `express-session` + `connect-mongo`; `lib/auth.ts` (`requireAuth`, `requirePermission`).
- Routes: `auth` (login/logout/me), `admin` (dashboard, orders list/detail/transition, inventory
  list/adjust) — all behind `requireAuth` + a per-action permission check.
- Config: `SESSION_SECRET`. Script: `seedStaff.ts` (`npm run seed:staff`), `seedDemo.ts`
  (`npm run seed:demo`).

**Frontend (Next.js route groups):**
- Move shop routes under `app/(shop)/` with the shop shell; root layout = html/body + globals only.
- `app/admin/` — client auth guard + admin shell; `login`, dashboard, `orders` + `orders/[id]`,
  `inventory`. Admin API calls in `lib/api.ts` (credentials: 'include').

**Fulfillment state machine (ported):**
```
confirmed → processing | cancelled
processing → packed | cancelled
packed → shipped | cancelled
shipped → delivered | delivery_failed
delivery_failed → shipped | cancelled
delivered, cancelled → (terminal)
```
Shipping needs tracking. Cancel restores stock exactly once (guarded update; concurrent transition
sees the changed state and can't double-restore).

**Rejected / deferred:** v1 platform auth, 11-role RBAC + custom-role UI, coupons, CMS/documents,
media, payments/secrets, returns, email jobs, customer accounts, audit-log view.

## 5. Tasks

- [x] Backend: staff + inventoryMovement models; permissions; config SESSION_SECRET.
- [x] Backend: session + auth middleware; auth routes.
- [x] Backend: fulfillment (transition + cancel-restock); inventory adjust; retrofit checkout sales.
- [x] Backend: admin routes (dashboard/orders/inventory) with permission checks.
- [x] Backend: seedStaff + seedDemo scripts; tests (permissions, transitions, adjust, cancel-restock).
- [x] Frontend: route-group split; admin guard + shell; login; dashboard; orders + detail; inventory.
- [x] Docs: scaffold tick, playbook (admin commands + env), README; memory + continuation prompt.
- [x] Verify: backend typecheck + 23 tests; frontend typecheck + build; auth-gating smoke test.

## 6. Updates

- **2026-10-16** — Grilled (3 rounds); v1 logic extracted; spec written; autonomous build started.
- **2026-10-16** — Shipped at code level. Backend typecheck clean, **23/23 tests pass** (incl.
  Atlas-backed cancel-restock + adjust + the existing checkout safety tests). Frontend typecheck +
  build clean (shop URLs unchanged; `/admin/*` added). Boot smoke test: server starts with
  session/connect-mongo; `/api/auth/me` and `/api/admin/*` correctly 401 when unauthenticated; bad
  credentials rejected. **Owner still to:** run `seed:staff`, log in at `/admin`, click the queue +
  an adjust. Noted a dev port mismatch (backend `.env` PORT=8000 vs frontend default 3001) to align.

## 7. Explanation (plain-English walkthrough)

### What changed
- A **back-office at `/admin`**: staff sign in with email + password, then see a **dashboard**, an
  **orders queue** they move through fulfillment states, and an **inventory** screen to adjust stock.
- Every admin action is **permission-checked** on the server. Sessions are stored in MongoDB so a
  Render restart doesn't log everyone out.
- Checkout now also **records each sale** in the stock history (completing what step 4 deferred).

### Why it was needed
- The owner needs to actually run the shop: fulfil orders safely (no illegal status jumps, tracking
  required to ship, cancelling puts stock back exactly once) and keep stock correct with an audit of
  every change. This is the operator half of the store.

### How it works, step by step
1. **Login:** `/admin/login` posts email+password to `POST /api/auth/login`. The server bcrypt-checks
   the hash and, if good, starts a **session** (a signed cookie whose data lives in MongoDB).
2. **Guard:** every `/admin` page is wrapped by a client shell that calls `GET /api/auth/me`; no
   session → bounce to login. Every `/api/admin/*` call is gated by `requireAuth` + a one-permission
   check (`requirePermission`).
3. **Orders:** `/admin/orders` lists orders (filter by status, search ref/phone/email). Opening one
   shows items + address + the **legal next states**. A button calls
   `POST /api/admin/orders/:id/transition`, which runs the **state machine** in a transaction:
   a status update guarded on the current state (so a concurrent change can't apply twice), and on
   **cancel** it restores each item's stock once and logs a movement.
4. **Inventory:** `/admin/inventory` lists every variant's stock (low ones highlighted) + recent
   movements. The adjust form calls `POST /api/admin/inventory/adjust`, which changes stock (an
   atomic guard stops it going negative) and logs a `before → after` movement.
5. **Dashboard:** `/admin` shows order count, revenue, low-stock count, and the latest orders.

### Files / functions changed
- **Models (new):** `staff.ts` (email, bcrypt hash, role, active), `inventoryMovement.ts`.
- **Lib (new):** `permissions.ts` (roles + `can`), `auth.ts` (`requireAuth` / `requirePermission`),
  `fulfillment.ts` (`TRANSITIONS`, `allowTransition`, `transitionOrder`), `inventory.ts`
  (`adjustStock`). **Edited:** `checkout.ts` (log a `Sale <id>` movement per item), `config.ts`
  (`SESSION_SECRET`), `index.ts` (session + mount auth/admin).
- **Routes (new):** `auth.ts` (login/logout/me), `admin.ts` (dashboard/orders/transition/inventory).
- **Scripts (new):** `seedStaff.ts` (`seed:staff`), `seedDemo.ts` (`seed:demo`).
- **Tests (new):** `permissions`, `fulfillment`, `adminFlows` (Atlas). **Edited:** `checkout.test`
  (clean movements; isolated test db).
- **Frontend:** route-group split (`app/(shop)/*` + root layout minimal); `app/admin/*`
  (`AdminShell`, `layout`, `login`, dashboard, `orders` + `orders/[id]`, `inventory`); admin API in
  `lib/api.ts`; admin types in `lib/types.ts`; admin CSS in `globals.css`.

### Important decisions
- **Simplified RBAC** (owner/manager) vs v1's 11 roles — same pattern, far less code. Owner and
  manager currently share the step-5 permissions; they diverge once owner-only features (staff /
  settings management) land.
- **Mongo-backed sessions** (connect-mongo) so Render restarts don't drop logins; `bcryptjs`
  (pure-JS, no native build on Windows/Render).
- **Transaction + guarded update** for cancel-restock — carried from v1, proven by the Atlas test.
- **Route groups** so admin and shop don't share a header.

### Tests / verification
- Backend: typecheck clean; `npm test` → **23/23** (incl. Atlas cancel-restock, adjust-can't-go-
  negative, and the step-4 checkout safety tests). Boot + auth-gating smoke test passed.
- Frontend: typecheck + build clean; all routes present.
- **Not browser-clicked yet:** sign in → work an order → adjust stock (owner to run after `seed:staff`).

### Edge cases and limitations
- **No in-app staff management** — staff are created via `npm run seed:staff` (env-driven).
- **Owner vs Manager** are functionally identical in step 5 (no owner-only features exist yet).
- **No audit-log view**, returns, coupons, email, or customer accounts (all later-phase).
- **Demo orders** (`seed:demo`) are fake and do not affect stock — clear them before launch.
- **Dev port:** backend must match the frontend's `NEXT_PUBLIC_API_URL` (align `.env` PORT with it).
