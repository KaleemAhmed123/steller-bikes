# Stellar Bikes — Playbook

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
- `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` — to enable **online payment** (UPI/card/netbanking)
  alongside Cash-on-Delivery. Both blank → online pay is off, COD still works. Setup: make a Razorpay
  account → Settings → API Keys → **Test mode** → generate test keys → paste both here. The secret
  stays server-side only. (Confirm **auto-capture** is ON in the dashboard so approved payments are
  actually collected.)
- `RAZORPAY_WEBHOOK_SECRET` — for **advance-payment links** (see 1e). Optional; without it the
  webhook refuses calls and the admin's "Check with Razorpay" button is the way to confirm a payment.
- `RESEND_API_KEY` + `MAIL_FROM` — to send **real email** (account verify, password reset, order
  receipts). Blank key → emails print to the server console (dev mock); nothing breaks. Setup: make a
  free account at [resend.com](https://resend.com) → **API Keys** → create one (`re_…`) → paste as
  `RESEND_API_KEY`. Set `MAIL_FROM` to an address on a **domain you verified** in Resend (Domains →
  add → add the DNS records), e.g. `Stellar Bikes <orders@yourdomain.com>`. For a quick test before you
  own a domain, `Stellar Bikes <onboarding@resend.dev>` works but only delivers to your own Resend
  account's email. A send failure never breaks a request — it's logged (`[mail]`) and skipped.

Frontend `.env.local` keys (all optional in dev):
- `NEXT_PUBLIC_API_URL` (default `http://localhost:3001` — set to your Render backend URL in production).
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — the **same test key id** as the backend. Presence of this flag is
  what shows the "Pay online" option at checkout. (UI flag only; the real key the popup uses comes
  back from the server.)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` — to enable
  **upload-from-computer** for product photos in the admin. Without them, the admin still works:
  paste an image URL or `/path`. Setup: make a free Cloudinary account → Settings → Upload → add an
  **unsigned** upload preset → put the cloud name + preset name here. (Unsigned = the browser uploads
  directly; safe to expose. Tighten later with a signed preset + size/type limits if needed.)
  This **also powers the retailer-logo Upload button** (Admin → Site content). **TODO (owner):** create
  the Cloudinary account and add these two values to `frontend/.env.local` (and Vercel). Until then the
  Upload button says "not set up" and pasting a logo link / `/path` works.
  - `NEXT_PUBLIC_CLOUDINARY_MAX_VIDEO_MB` (default 50) — biggest video the admin may upload (variant
    videos, hero video). Cloudinary's free plan allows up to 100 MB. The upload preset must allow
    **images and videos** (don't restrict it to images).

### 1c. Seed the sample cycles

```bash
cd backend && npm run seed      # inserts ~25 clearly-sample cycles (Mountain/City/Road/Kids/Accessories, some discounted) into MongoDB
                                # also sets the `featured` flag on 6 curated cycles → re-run after upgrading to populate it
```

After seeding, five sample cycles carry the offer type `diwali` (and the master list has it). If the
store has never saved Site content, the seed also adds six **fake** "Sample Brand" retailer logos and
switches the Diwali offer rail on — replace/remove them in Admin → Site content. Seeding never
overwrites retailers or offer-rail settings you have already saved.

### 1c-2. Admin-editable homepage (new)
- **Admin → Site content** (owner only): the text over the hero video (60,000+ / TRUSTED CUSTOMERS /
  tagline / button / Stellar Originals title, subtitle, optional link), the **Offer rail** (on/off, title,
  subtitle, which offer types) and the **Authorized retailers** logo grid (name, logo link or Upload,
  optional https link). Defaults (the Canva text) live in `backend/src/lib/siteContent.ts`.
- **Admin → Platform → Offer types** (owner): add `Diwali`, `New Year`… (stored as `diwali`, `new-year`).
  Tag products in the product form. A type still on products can't be deleted.
- **Next sale season:** add the offer type → tag products → Site content → set title/subtitle, tick the
  offer type, tick **Show the offer rail** → Save. No code push. After the sale, untick it.
- Shop filter: `/shop?offerType=diwali,new-year` (any-of; synced to the URL).
- Hero videos: `frontend/public/hero_section_{desktop,mobile}_view_video_compressed.mp4`. To change a
  video, replace the file (keep the names) and redeploy.

### 1e. Advance-payment links (agent → customer) — needs Razorpay keys

How it works: an agent calls the customer and agrees an amount (usually the Delhivery delivery
charge). In **Admin → Orders → (order) → Advance payment** they enter the amount + a note and press
**Generate payment link**. The customer sees "Advance payment requested" with a **Pay now** button on
their order page (`/order/<id>`). The admin card shows awaiting / paid / cancelled / expired.

Until `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` exist in `backend/.env` the card shows "Payment links
aren't switched on yet" — nothing else breaks. **To switch it on (owner):**
1. Razorpay account → complete KYC → Settings → API Keys → generate keys (Test mode first) → put both in
   `backend/.env`. Confirm **Payment Links** is enabled on the account (Dashboard → Payment Links).
2. So a payment is recorded even if the customer closes the tab: Settings → **Webhooks → Add new
   webhook** → URL `https://<your-backend>/api/webhooks/razorpay` (needs a public https URL — your Render
   backend; local testing needs a tunnel such as ngrok) → events `payment_link.paid`,
   `payment_link.cancelled`, `payment_link.expired` → choose a secret → put it in
   `RAZORPAY_WEBHOOK_SECRET`.
3. **If a customer says they paid but the order shows "awaiting payment":** press **Check with
   Razorpay** on that link. It asks Razorpay directly and records the truth. Every payment also shows
   in the Razorpay dashboard under the order id (`reference_id`) for reconciliation.

Rules: ₹1–₹1,00,000 per link · one open link per order · a paid link is final (never double-counted) ·
an advance is tracked **separately** from the order's own payment status (it is extra money for
delivery). If you cancel an order after an advance was paid, refund it from the Razorpay dashboard.

**COD orders:** marking an order **delivered** now marks it **paid** automatically. The order page also
has a **Payment** card (owner only) to mark COD cash received / refunds by hand.

### 1g. Delivery charges (Kanpur flat fee) and pincode autofill

- **Inside Kanpur:** every order pays a flat **Fitted Delivery** fee (default **₹299**, on every product).
  **Elsewhere:** nothing is added at checkout — delivery is charged by Delhivery distance; an agent calls to
  confirm the order and agree the advance, then raises a payment link (1e).
- Change the fee or the list of "inside Kanpur" pincodes in **Admin → Settings → Delivery charges**
  (default list: 208001–208027; set the fee to 0 for free Kanpur delivery). "Inside Kanpur" is decided by
  **this list**, never by a web lookup, so pricing always works offline.
- At checkout the customer types the pincode and **city/state autofill** from India Post's free public
  directory (`api.postalpincode.in`, no account or key). It is only a convenience: if it is slow or down the
  customer types city/state and the fee is still correct. Answers are cached 24 h.
- The same wording ("Inside Kanpur…, outside Kanpur…, our agent will call to confirm every order") shows on
  the product page (with a pincode checker), cart, checkout and footer — it is one component
  (`DeliveryInfo.tsx`); edit the sentences there.
- Orders placed before this change keep their old totals. **Guest customers** find their order (and its
  payment link) through the browser they ordered from or by signing in to **Your account**, so encourage
  customers to create an account at checkout; the admin card also has a **Copy link** button to send a link by
  WhatsApp.

### 1f. Product photos & videos per option

In **Admin → Products → (product)**, open **Photos & videos** under each variant (size/colour). Add by
link or upload, reorder with the arrows (top = shown first), max 10 per option. The product page swaps
the gallery when the shopper picks an option. An option with **no** media shows a "No Image Available"
box (it never borrows another option's photo). **Existing products need media once:** run
`cd backend && npm run backfill:variant-media` (copies each product's main/gallery photos into options
that have none; safe to re-run). `npm run seed` already does this for the demo catalogue.

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
                                 #                 inventory, inventory/adjust,
                                 #                 products CRUD [list/:id/create/patch/delete],
                                 #                 settings [get/patch]) — auth + permission
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

**Admin config added — 2026-10-18** (`docs/specs/storefront-redesign/build-step-5.md`): the admin now
has **Products** (full create/edit/delete, variants, featured toggle, photo upload or paste, status)
and **Settings** (shop address/phone/WhatsApp/hours/delivery). New permissions: `products.manage`
(owner + manager), `settings.manage` (owner only — the Settings nav shows for owners). Photo upload
uses Cloudinary (see frontend env above); paste-a-URL works without it. Backend typecheck + 37 tests
green; live authenticated create→edit→delete E2E verified (variant ids stay stable across edits).
**`next build` not yet run** (dev was live on :3000 — stop dev, then build).

Next later phases (unchanged): payments (Razorpay), returns, coupons, real email.

## 4. Continuation prompt (paste this to start a fresh session in this folder)

> Open the project at `C:\Users\hp\Desktop\raju-cycles-v2` first.

```
This is the Stellar Bikes rebuild — an online store + owner admin for a cycle shop in Kanpur, UP.
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
