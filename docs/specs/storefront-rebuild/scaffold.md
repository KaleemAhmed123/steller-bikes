# Storefront Rebuild — Scaffold Plan

**Status:** Approved · spine + steps 2 (catalogue), 3 (cart), 4 (COD checkout) & 5 (admin) built &
verified (code level); catalogue verified live + checkout/cancel-restock tests green on Atlas ·
**Created:** 2026-10-16 · **Last updated:** 2026-10-16 · *(frontend is Next.js App Router, split into
`(shop)` + `admin` route groups — see the `build-step-*.md` files; §2 shows the original Vite spine.)*

> The plan for the **first** code. **Approve this before I write anything.** Strategy (ponytail +
> thin-spine-first): prove the pipes end to end with the smallest real slice, then thicken feature
> by feature. No file beyond these planning docs gets written until you say go.

## 1. What the thin spine proves (the only thing that *runs* in v1 of the code)

The smallest slice that proves the whole stack is wired:

```
React storefront  ──GET /api/products──▶  Express API  ──▶  MongoDB (Atlas)
      │                                        │
      │ ◀──────── list of published cycles ────┘
      ▼
  shows the 3 seeded sample cycles on the shop page
```

**Done = verifiable:** run the backend + frontend, open the shop page, see the 3 seeded cycles
loaded from MongoDB through the real API. That proves React → Express → Mongo works end to end.
Everything else (cart, checkout, admin) is a later layer added onto a spine that already runs.

## 2. Repo layout (target for this scaffold)

```
raju-cycles-v2/
  backend/
    package.json
    tsconfig.json
    .env.example                # MONGODB_URI, PORT, SESSION_SECRET, ...
    src/
      index.ts                  # Express app + start
      db.ts                     # Mongoose connect
      config.ts                 # env, validated at boot (Zod)
      models/                   # product.ts (spine) ... order, cart, staff, settings (later)
      routes/                   # products.ts (spine) ... cart, checkout, admin (later)
      lib/                      # money, domain helpers (pricing, state machine) — ported from v1
      seed.ts                   # inserts the 3 sample cycles
    tests/                      # one checkout-safety test when checkout lands
  frontend/
    package.json
    index.html
    vite.config.ts
    .env.example                # VITE_API_URL
    src/
      main.tsx
      api.ts                    # fetch helper + money() formatter
      styles/global.css         # ported v1 charcoal+lime theme
      pages/Shop.tsx            # spine: lists products
      components/               # ProductCard, StoreShell (later)
  docs/                         # (this planning folder)
  playbook.md
  README.md
  CLAUDE.md
  .gitignore
```

## 3. What is explicitly NOT in the scaffold (later build steps)

Cart · checkout + the transaction/stock-guard · orders · inventory admin · staff login · store
settings · and everything in the deferred list (payments, returns, promotions, CMS, media, roles,
audit, customer accounts). Each is its own `build-step-N.md` once the spine runs.

## 4. Build order after the spine

1. **Spine** (this scaffold): products in Mongo → API → shop page. ✅ gate.
2. **Catalog**: product detail page, categories, search/filter (storefront). ✅ **done — see
   [`build-step-2.md`](build-step-2.md)** (also migrated the frontend to Next.js App Router).
3. **Cart**: guest cookie cart, add/change/remove, live price lookup. ✅ **done — see
   [`build-step-3.md`](build-step-3.md)**.
4. **Checkout (the hard one)**: Zod-validated address, server-recomputed totals, **transaction +
   stock guard + idempotency key**, COD only. Ships with its safety test. ✅ **done — see
   [`build-step-4.md`](build-step-4.md)** (safety test green on Atlas).
5. **Orders + inventory (admin)**: staff login, order list + fulfillment state machine, stock adjust.
   ✅ **done — see [`build-step-5.md`](build-step-5.md)** (+ light dashboard; RBAC owner/manager).
6. **Store settings (admin)**: name, hero, shipping, COD limit, checkout on/off.
7. *(Later phases)* Razorpay · returns · promotions · CMS · media · full roles · audit · customer
   accounts.

## 5. Tooling defaults (say if you'd prefer otherwise)

| Concern | Proposed | Why |
|---------|----------|-----|
| Language | **TypeScript** both sides | Catches money/stock bugs early. |
| Backend | **Express** + **Mongoose** | Conventional, maintainable, familiar. |
| Validation | **Zod** at every API boundary | The one trust boundary we never cut. |
| Auth | **httpOnly cookie session** (`express-session`) | Simple, safe; added at build step 5, not the spine. |
| Frontend | **React + Vite + TypeScript** | Fast, standard. |
| Styling | **Ported v1 CSS theme**, plain CSS | Good and free; no component library (ponytail). |
| Passwords | **bcrypt** | Standard, boring, correct. |
| Tests | **node:test** (built-in) | No framework to add; one checkout-safety test when checkout lands. |
| Lint/format | **ESLint + Prettier** | Readable from line one — the opposite of v1's minified code. |

**Deliberately skipped (MVP):** Docker, CI/CD, multi-environment, GraphQL, state-management
libraries, component libraries, microservices.

## 6. Open micro-decisions (confirm before I build)

These are the open questions from [`context/02-decisions.md`](context/02-decisions.md). Answer and
I'll record the outcome there and proceed.

| # | Question | My proposal |
|---|----------|-------------|
| Q1 | TypeScript or plain JS? | **TypeScript** both sides |
| Q2 | Mongoose or native driver + Zod? | **Mongoose** |
| Q3 | Cookie session or JWT? | **Cookie session** |
| Q4 | Port v1's CSS theme or start fresh? | **Port it** |
| Q5 | One repo (`backend/` + `frontend/`)? | **Yes** |
| Q6 | Seed v1's 3 sample cycles? | **Yes** |
| Q7 | Do you have a **MongoDB Atlas** connection string ready, or should the spine run against a **local MongoDB** first and switch to Atlas later? | **Start local if Atlas isn't ready; switch to Atlas before checkout** (checkout needs the replica set). |

## 7. What the USER must do before / during the spine

- **Nothing to code.** When ready: create a **MongoDB Atlas** free cluster and share the connection
  string (goes in `backend/.env`, never in chat or git) — *or* tell me to start against a local
  MongoDB.
- Confirm the Q1–Q7 answers above.

## 8. Updates

- **2026-10-16** — Scaffold plan created during planning. Awaiting approval on §6 before any code.
- **2026-10-16** — **Approved** (all defaults as recommended; owner setting up Atlas). Q1–Q7
  answered: TypeScript · Mongoose · cookie session · port v1 CSS · one repo · seed v1 samples ·
  Atlas (owner creating the cluster now). **Spine built & verified at code level:** `backend/`
  (Express + Mongoose + Zod config + product model + `GET /api/products` + seed) and `frontend/`
  (React + Vite + ported theme + shop page). Both `npm install` + `typecheck` clean; frontend
  `build` clean. **Not yet verified:** live DB round-trip — needs the owner's Atlas `MONGODB_URI`,
  then `npm run seed` + `npm run dev` on both. One pragmatic spine choice to revisit: dev CORS is
  avoided via the Vite proxy; a real `cors` setup (or serving the built frontend from Express)
  comes when we deploy.
- **2026-10-16** — **Build step 2 shipped (code level).** Catalogue: product detail page
  (`/p/:slug`) + category/search/price filters, all server-side on Express. **Frontend migrated to
  Next.js (App Router), frontend-only** (owner's call); Express stays the backend. Two origins now →
  the deferred `cors` setup landed early (allows `FRONTEND_ORIGIN`). Hosting set to Vercel (frontend)
  + Render (backend). Backend typecheck + 7 tests pass; frontend typecheck + `next build` pass. Live
  DB round-trip still pending the owner's Atlas run. Details: [`build-step-2.md`](build-step-2.md).
- **2026-10-16** — **Live DB round-trip verified** by the owner (shop loads the 3 seeded cycles).
- **2026-10-16** — **Build step 3 shipped (code level).** Guest cart: cookie-backed cart with
  add/change/remove, live price + stock recompute on every call, header count, `/cart` page,
  add-to-cart on the detail page. Cross-site cookie handled (`SameSite=None; Secure` in prod).
  Backend typecheck + 12 tests pass; frontend typecheck + build pass. Checkout button is a
  placeholder. UI kept functional — premium revamp deferred to after checkout (owner's call).
  Details: [`build-step-3.md`](build-step-3.md).
- **2026-10-16** — **Build step 4 shipped (code level).** COD checkout: `/checkout` address form,
  server-recomputed totals (free shipping/no tax for MVP), `placeOrder` with a **transaction +
  atomic stock guard + idempotency key**, `/order/<id>` confirmation. **Safety test passed against
  real Atlas** (last-unit race → one order, no oversell; double-submit → one order). Backend 15/15
  tests pass; frontend typecheck + build clean. Inventory audit log, COD limits, PIN serviceability
  deferred (step 5 / step 6). Details: [`build-step-4.md`](build-step-4.md).
  **Next: the premium-minimalist UI/UX revamp** (deferred by decision until checkout worked), then
  step 5 (orders + inventory admin).
- **2026-10-16** — **Build step 5 shipped (code level).** Admin back-office: staff email+password
  login (bcrypt, 7-day Mongo-backed session), owner/manager RBAC, orders queue + full fulfillment
  state machine (tracking-to-ship, cancel-restocks-once), inventory adjust + movement history, light
  dashboard. Checkout retrofitted to log sale movements. Frontend split into `(shop)` + `admin` route
  groups. Logic ported from v1 (dead code ignored). Backend 23/23 tests pass (Atlas cancel-restock +
  adjust + checkout safety); frontend typecheck + build clean; boot + auth-gating smoke test passed.
  Details: [`build-step-5.md`](build-step-5.md). **Next up: the premium-minimalist UI/UX revamp.**
- **2026-10-16** — **UI/UX revamp shipped (code level).** Premium-minimalist pass on the storefront
  (warm-gold accent, Space Grotesk + Inter type, full-bleed hero, dark header/footer sections,
  subtle scroll-reveal, skeletons + empty states + add-to-cart toast); admin light-touch via shared
  tokens. Styling only — no logic touched. Frontend production build clean. Browser QA with the owner
  pending. Details: [`ui-revamp.md`](ui-revamp.md).
