# Raju Cycles — Playbook

The single home for every command, env value, and run step. Update this in the **same** change
whenever something operational changes.

## 0. The mental model (read once)

- `backend/` = the Express API (talks to MongoDB on port **3001**). Deploys to **Render**.
- `frontend/` = the **Next.js (App Router)** app on port **3000**. Deploys to **Vercel**.
- They are **separate apps on separate origins**. The frontend reads the backend's URL from
  `NEXT_PUBLIC_API_URL`, and the backend allows the frontend's origin via **CORS** (`FRONTEND_ORIGIN`).
- The frontend never touches MongoDB — it fetches from Express. The server is the authority on
  price and stock. See
  [`docs/specs/storefront-rebuild/context/00-overview.md`](docs/specs/storefront-rebuild/context/00-overview.md).

## 1. One-time setup

### 1a. Create your MongoDB Atlas database (YOU do this once)

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up (free).
2. **Create a cluster** → choose the **free M0** tier → pick a region near India (e.g. Mumbai) →
   Create.
3. **Database Access** (left menu) → **Add New Database User** → username + password (save them) →
   built-in role **Read and write to any database** → Add.
4. **Network Access** (left menu) → **Add IP Address** → for now choose **Allow access from
   anywhere** (`0.0.0.0/0`). *(We tighten this before launch.)*
5. **Clusters** → **Connect** → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Replace `<user>` and `<password>` with the ones from step 3.
6. Paste it into `backend/.env` as `MONGODB_URI=...` (see 1b). **Never** put it in chat or git.

> Atlas free tier is a **replica set**, which is what lets our checkout use transactions later.

### 1b. Install dependencies + configure

```bash
# from the project root
cd backend  && npm install && cp .env.example .env   # then paste MONGODB_URI into backend/.env
cd ../frontend && npm install                         # frontend .env.local is optional in dev
```

Backend `.env` keys: `MONGODB_URI` (required), `PORT` (default 3001), `FRONTEND_ORIGIN` (default
`http://localhost:3000` — set to your Vercel URL in production).
Frontend `.env.local` key (optional in dev): `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`
— set to your Render backend URL in production).

### 1c. Seed the sample cycles

```bash
cd backend && npm run seed      # inserts ~25 clearly-sample cycles (Mountain/City/Road/Kids/Accessories, some discounted) into MongoDB
                                # also sets the `featured` flag on 6 curated cycles → re-run after upgrading to populate it
```

### 1d. Create your admin login + (optional) demo orders

```bash
# from backend/ — set these in backend/.env first (STAFF_ROLE defaults to owner):
#   STAFF_EMAIL=you@shop.com   STAFF_PASSWORD=choose-a-strong-one   STAFF_ROLE=owner
cd backend && npm run seed:staff    # creates/updates the owner login
# add a manager later: set STAFF_ROLE=manager (+ their email/password) and re-run.

cd backend && npm run seed:demo     # OPTIONAL: a few clearly-fake demo orders to see the admin
```

Then sign in at **http://localhost:3000/admin** with those credentials.

> **Port must match:** the frontend calls `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
> If `backend/.env` sets a different `PORT` (e.g. 8000), either set `PORT=3001` there, or set
> `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`. They must agree.

## 2. Everyday commands

```bash
# Terminal 1 — the API
cd backend && npm run dev        # http://localhost:3001
                                 #   GET    /health
                                 #   GET    /api/products[?category=&q=&minPrice=&maxPrice=]  (each product carries soldCount)
                                 #   GET    /api/products/:slug
                                 #   GET    /api/settings                 (public shop details for the showroom)
                                 #   GET    /api/cart
                                 #   POST   /api/cart/items              { variantId, quantity }
                                 #   PATCH  /api/cart/items/:variantId   { quantity }   (0 removes)
                                 #   DELETE /api/cart/items/:variantId
                                 #   POST   /api/checkout   { email, address, idempotencyKey }
                                 #   GET    /api/orders       (this owner's history) · /api/orders/:id
                                 #   POST   /api/auth/login | /logout · GET /api/auth/me   (STAFF)
                                 #   /api/account/* (signup, login, logout, me, verify,
                                 #                 password/forgot, password/reset, addresses CRUD) — CUSTOMER
                                 #   /api/admin/* (dashboard, orders, orders/:id/transition,
                                 #                 inventory, inventory/adjust) — auth + permission
# Terminal 2 — the storefront
cd frontend && npm run dev       # http://localhost:3000
                                 #   shop + /p/<slug> + /cart + /checkout + /order/<id>
                                 #   /login /signup /account /account/verify /forgot-password /reset-password
                                 #   /admin (login, dashboard, orders, inventory)
```

> Prices in the filter query are in **paise** (₹1 = 100 paise); the UI converts rupees → paise.
> The cart is keyed to a browser cookie (`rc_guest`); browser cart calls use
> `credentials: 'include'`, and the API allows that origin via CORS. A **logged-in customer** owns
> their cart/orders by account id instead (`customer:<id>`), merged from the guest cart on login.
>
> **Customer accounts:** signup/login reuse the staff session + bcrypt. Email is **mocked** — the
> verification + password-reset links are **printed in the backend (Terminal 1) console**, not sent.
> Verifying (or resetting) links a customer's past guest orders by email. Swap to SendGrid later by
> replacing the body of `backend/src/lib/email.ts`.

Checks:

```bash
cd backend  && npm run typecheck && npm test   # 26 tests; the DB-backed ones run on Atlas
cd frontend && npm run typecheck && npm run build
```

> The transaction tests (checkout safety, cancel-restock, stock adjust) and the account tests
> (cart-merge, order-claim) need a replica-set DB, so they run against Atlas in separate
> `raju-cycles-test-*` databases (auto-cleaned). They're **skipped** if `MONGODB_URI` isn't set, and
> they **error** if your current IP isn't on the Atlas cluster's **IP Access List** — add it under
> Atlas → Network Access (or allow `0.0.0.0/0` for dev).

## 3. Status

**Spine + steps 2 (catalogue), 3 (cart), 4 (COD checkout) & 5 (admin) built & verified (code level) — 2026-10-16.**
- Backend: products + cart + **checkout** (transaction + stock guard + idempotency) + orders + the
  **admin** (staff auth with bcrypt + Mongo-backed session, owner/manager RBAC, orders + fulfillment
  state machine, inventory adjust + movements, dashboard) + CORS. Typecheck clean; `npm test` →
  **23/23 pass** (Atlas: checkout safety, cancel-restock, adjust).
- Frontend (**Next.js App Router**, `(shop)` + `admin` route groups): shop, detail, cart, checkout,
  confirmation, and `/admin` (login, dashboard, orders + detail, inventory). Typecheck + build clean.
- **Verified on Atlas:** live catalogue; checkout safety; cancel-restocks-once; adjust-can't-go-
  negative. Boot + auth-gating smoke test passed.
- **Still owner's to do:** set `STAFF_*` in `backend/.env`, run `npm run seed:staff`, sign in at
  `/admin`, and click through an order + a stock adjust.

**Storefront redesign shipped — 2026-10-18** (storefront-first; **no backend route/schema/logic
change**). Cinematic 3D hero (React Three Fiber + GSAP + in-code reflections/bloom + reflective
floor + multi-beat scroll), a second 3D "turntable" moment, a 3D-forward homepage, redesigned
cards/catalogue/detail, a localStorage wishlist (`/saved`), and **dedicated collection pages**
(`/collections/new-arrivals|staff-picks|budget|offers`). The catalogue moved to **`/shop`** (home is
now the 3D experience). New frontend deps: `three`, `@react-three/fiber`, `@react-three/drei`,
`gsap`, `@react-three/postprocessing`. Hero 3D model is CC-BY (Poly/Google), attributed in the footer
+ `docs/specs/storefront-redesign/THIRD-PARTY-ASSETS.md`. Typecheck (FE+BE) + `next build` clean (19
routes); verified live on Atlas. Full walkthrough: `docs/specs/storefront-redesign/`.

**Backend data fields added — 2026-10-18** (`docs/specs/storefront-redesign/build-step-4.md`):
`featured` flag (seed-controlled; replaced the hardcoded slug list), product `images[]` gallery
(detail-page gallery, dormant until real photos are seeded), honest **popularity** read from orders
(`soldCount` on the catalogue → "Most popular" sort + `/collections/popular`; **checkout untouched**),
and a public **store-settings** doc + `GET /api/settings` (Showroom reads it; blank = "coming soon").
Backend typecheck + 30 tests green; frontend typecheck clean. **`next build` not yet run** (dev was
live on :3000 — stop dev, then build). **Re-run `npm run seed`** so existing products get `featured`.
Still deferred: admin product-edit UI (to toggle `featured`), account-synced wishlist, settings admin UI.

Next later phases (unchanged): payments (Razorpay), returns, coupons, real email.

## 4. Continuation prompt (paste this to start a fresh session in this folder)

> Open the project at `C:\Users\hp\Desktop\raju-cycles-v2` first.

```
This is the Raju Cycles rebuild — an online store + owner admin for a cycle shop in Kanpur, UP.
Stack: Next.js App Router (frontend, Vercel) + Node/Express (backend API, Render) + MongoDB (Atlas),
all TypeScript. Next.js is the frontend ONLY — it never touches the DB; Express is the authority on
price/stock. We rebuilt from a v1 Cloudflare prototype (at C:\Users\hp\Desktop\raju-cycles, audited
in its AUDIT-REPORT.md), carrying over its proven design.

Before doing anything, read these in order:
- CLAUDE.md (project rules: plain teaching style, plan-first-then-wait, ponytail, spec-first)
- docs/specs/storefront-rebuild/context/00-overview.md, 01-domain-and-data.md, 02-decisions.md
- docs/specs/storefront-rebuild/scaffold.md (the build plan) + build-step-2.md (catalogue + the
  Next.js migration, with the full walkthrough)
- playbook.md (all commands + the MongoDB Atlas setup)

Current state: spine + steps 2 (catalogue), 3 (cart), 4 (COD checkout) & 5 (admin) built and
verified at code level; catalogue verified live, and the checkout safety + cancel-restock + adjust
tests are green on Atlas. Backend (Express + Mongoose + Zod): products (filtered) + /:slug + cookie
cart + POST /api/checkout (transaction + atomic stock guard + idempotency) + GET /api/orders/:id +
staff auth (POST /api/auth/login|logout, GET /api/auth/me; bcrypt + Mongo-backed 7-day session) +
/api/admin/* (dashboard, orders, orders/:id/transition, inventory, inventory/adjust) gated by
requireAuth + a per-action permission (owner/manager RBAC) + CORS; typecheck clean, 23 tests pass
(some run real transactions on Atlas). Frontend (Next.js App Router, split into (shop) + admin route
groups): shop + detail + cart + /checkout + /order/<id>, and /admin (login, dashboard, orders +
orders/[id], inventory). Typecheck + build clean. Logic for the admin/checkout was ported from the
v1 reference at C:\Users\hp\Desktop\raju-cycles (see its AUDIT-REPORT.md) — bring logic, ignore dead
code. To run: backend/.env needs MONGODB_URI (+ SESSION_SECRET, and STAFF_EMAIL/STAFF_PASSWORD to
seed a login); `npm run seed` + `npm run seed:staff` (+ optional `npm run seed:demo`) in backend,
then `npm run dev` on both — shop at http://localhost:3000, admin at /admin. Ensure backend PORT and
frontend NEXT_PUBLIC_API_URL agree.

Next: the premium-minimalist UI/UX revamp (deferred by decision until checkout + admin worked), then
later phases (payments/Razorpay, returns, coupons, email, customer accounts). The owner likes a
thorough upfront grill (tappable questions) and then fully-autonomous execution of the agreed step.
Plan/grill first, then build.

Work in my style: explain in plain words with one-line meanings for jargon; plan and WAIT for my
go before writing code on anything non-trivial; keep the spec/context/playbook docs updated in the
same change; follow ponytail (build the least that works); and end replies with What I achieved /
What I need from you / Next steps. Start by telling me the current state and the plan for step 2.
```
