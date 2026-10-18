# Storefront Rebuild — Spec Index

**Status:** In progress — spine + steps 2 (catalogue), 3 (cart), 4 (COD checkout) & 5 (admin) built
& verified (code level); catalogue verified live + checkout/cancel-restock tests green on Atlas ·
**Started:** 2026-10-16 · **Last updated:** 2026-10-16

## One-line pitch

An online store **and** owner back-office for Raju Cycles (a real cycle shop in Kanpur, UP), rebuilt
on a stack the owner can maintain — **Next.js (frontend) + Node/Express + MongoDB** — carrying over the proven,
hard-won design from the v1 prototype instead of reinventing it.

> The server is the authority on price and stock. The admin is permission-gated. Keep it boring.

## The documents

| Doc | What it is | Read it when |
|-----|-----------|--------------|
| [`context/00-overview.md`](context/00-overview.md) | What we're building, the one idea, the stack and why each piece is here, glossary. **Start here.** | You want the whole picture fast. |
| [`context/01-domain-and-data.md`](context/01-domain-and-data.md) | The data model ported from v1 → MongoDB collections; what we keep for the MVP and defer. | You're building the backend or the DB. |
| [`context/02-decisions.md`](context/02-decisions.md) | Locked decisions (with dates) + open questions still to answer. | You want to know what's settled and what isn't. |
| [`scaffold.md`](scaffold.md) | **The plan for the first code — approve this before any code is written.** Repo layout, thin-spine first, tooling defaults, open micro-decisions. | Right now. |
| [`build-step-2.md`](build-step-2.md) | Build step 2: the catalogue (product detail page + category/search/price filters) **and** the frontend migration to Next.js (App Router). Includes the full walkthrough. | You want what was built after the spine, and why the stack changed. |
| [`build-step-3.md`](build-step-3.md) | Build step 3: the guest cart (cookie-backed, live price/stock, `/cart` page, add-to-cart). Includes the full walkthrough. | You want how the cart works and why it stores no price. |
| [`build-step-4.md`](build-step-4.md) | Build step 4: COD checkout — the transaction + atomic stock guard + idempotency key, `/checkout` + `/order/<id>`, and the Atlas safety test. Full walkthrough. | You want how checkout stays safe (no oversell, no double order). |
| [`build-step-5.md`](build-step-5.md) | Build step 5: the admin — staff login (bcrypt + session), owner/manager RBAC, orders queue + fulfillment state machine, inventory adjust + movements, dashboard. Logic ported from v1. Full walkthrough. | You want how the back-office works and what was carried from v1. |
| [`ui-revamp.md`](ui-revamp.md) | The premium-minimalist visual pass: gold accent, Space Grotesk/Inter type, full-bleed hero, dark sections, scroll-reveal, skeletons/empty-states/toast. Styling only. | You want the look-and-feel direction and what styling changed. |
| [`customer-accounts.md`](customer-accounts.md) | Customer accounts: email+password signup/login, order history, saved address book, guest-order claiming (verification-gated), email verify + password reset with a mock sender. Reuses the staff session + bcrypt. Full walkthrough. | You want how shopper accounts work and why claiming is gated behind verification. |

## Locked decisions (from the rebuild interview, 2026-10-16)

1. **Fresh rewrite, keep the blueprint.** New project; port v1's design, don't mold v1's code.
2. **Stack:** React (frontend) + Node/Express (backend API) + **MongoDB** (owner's choice; noted the
   Postgres recommendation, owner chose Mongo).
3. **Hosting:** MongoDB **Atlas** free tier (a replica set → gives us transactions) + a Node host
   (Render/Railway) + a static host for the React app.
4. **Auth v1:** staff/admin login (email + password) + **guest checkout** (cookie cart). Full
   customer accounts come later.
5. **V1 = lean MVP:** catalog, cart, COD (cash-on-delivery) checkout, orders, inventory, core store
   settings. Online payments, returns, promotions, CMS pages, staff roles, media, audit come in
   later phases.
6. **Money in paise (integers), INR.** No floating-point money.
7. **New folder** (`raju-cycles-v2`); the v1 prototype stays as read-only reference.

## Build status

**Spine + steps 2 (catalogue), 3 (cart), 4 (COD checkout) & 5 (admin) built & verified at code level (2026-10-16).**
- `backend/` (Express + Mongoose + Zod): filtered products + detail, guest **cart**, **checkout**
  (transaction + stock guard + idempotency), orders, and the **admin** — staff auth (bcrypt +
  Mongo-backed session), owner/manager RBAC, orders + fulfillment state machine, inventory adjust +
  movements, dashboard. Typecheck clean; `npm test` → **23/23 pass** (Atlas: checkout safety,
  cancel-restock, adjust).
- `frontend/` (**Next.js App Router**, `(shop)` + `admin` route groups): shop + detail + cart +
  checkout + order confirmation, and `/admin` (login, dashboard, orders + detail, inventory).
  Typecheck + build clean.
- **Verified on Atlas:** live catalogue; checkout safety; cancel-restocks-once; adjust-can't-go-
  negative. Boot + auth-gating smoke test passed. Browser click-through (sign in → work an order →
  adjust stock) is the owner's to confirm after `npm run seed:staff`. Commands:
  [`../../../playbook.md`](../../../playbook.md).

**UI revamp shipped (2026-10-16)** — see [`ui-revamp.md`](ui-revamp.md).

**Customer accounts built & verified (2026-10-18)** — email+password signup/login, order history, saved
address book, verification-gated guest-order claiming, mock-email verify + password reset. Typecheck +
frontend build clean; **26/26 tests pass on Atlas**; live end-to-end smoke test green (signup → verify →
claim, address book, cart-merge). See [`customer-accounts.md`](customer-accounts.md).

Next: remaining later phases — **Razorpay payments**, returns, coupons, real email (SendGrid).
