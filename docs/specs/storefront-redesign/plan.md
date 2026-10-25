# Storefront Redesign

## 1. Task

- **Name:** Storefront redesign — cinematic 3D hero + editorial homepage + catalogue/detail/cards.
- **Status:** In progress.
- **Started:** 2026-10-18.
- **Last updated:** 2026-10-18.

## 2. What you asked for (from the brief + grill answers)

A complete revamp of the customer-facing storefront for **Stellar Bikes**:

- A **cinematic, scroll-driven 3D bicycle hero** that makes visitors pause, with a camera that
  moves deliberately as they scroll and strong oversized typography.
- An **art-directed homepage** with section-specific layouts (not one repeated card grid):
  category explorer, new arrivals, a curated/featured row, budget picks, offers, kids & family,
  accessories, showroom/contact, footer.
- Redesigned **product cards**, **catalogue/filtering**, and **product detail** that continue the
  same visual language.
- Keep the store **real and shoppable**: reuse the existing cart, checkout, wishlist-capable UI,
  and connect add-to-cart / variant selection to the working API.
- **Honesty:** no invented prices, stock, discounts, best-seller claims, delivery promises, or
  contact details. Show only what the data backs.
- **Strictly no backend change:** no route, schema, migration, or business-logic edits. Seed
  **data** may be expanded (it is data, not logic).

### Locked decisions (grill, 2026-10-18)

1. **3D hero:** React Three Fiber + Three.js, scroll-driven camera on a verified free-licence bike
   model; cinematic fallback if no model verifies in-session. **GSAP ScrollTrigger** drives the
   pinned sequence + reveals.
2. **Data:** rewrite the seed to ~24 clearly-sample bikes across Mountain / City / Road / Kids +
   a few Accessories, with real `compareAt` discounts and multi-variant products. Data only.
3. **Brand name:** **Stellar Bikes** (matches the whole existing app).
4. **Scope:** homepage + catalogue + product detail + shared nav/footer/cards get the full new
   system; cart/checkout/account get a light token refresh; **admin untouched**.
5. **Motion:** add **GSAP + ScrollTrigger** on top of R3F.
6. **Popularity section:** honestly named **"Featured / Staff Picks"** (no fake sales data).
7. **Store facts:** keep COD + "Kanpur, Uttar Pradesh"; **drop the "free shipping" promise**; no
   fake phone/address.
8. **Verification:** user whitelists the Atlas IP so the seed can run + the live site can be
   screenshotted; also typecheck + production build.

## 3. Open questions

All resolved in the two grill rounds above. None outstanding.

## 4. Plan

### Design system (tokens, plain CSS — no Tailwind, matching the existing app)

- **Foundations:** white + graphite. **Accents:** a small vivid set (the existing gold as primary,
  plus an electric accent per section) used deliberately to give each section its own identity.
- **Type:** keep Space Grotesk (display) + Inter (body); push display to an oversized, condensed,
  athletic treatment for headlines.
- **Rhythm:** alternate light and dark sections down the page.
- Tokens live in `globals.css` under `:root`; new section/component styles appended there (the app
  already uses one stylesheet).

### Data access / adapter layer

- A typed `lib/catalogue.ts` that calls the existing API and derives the homepage rails **honestly**
  from real fields: newest (`createdAt`), budget (min variant `price`), offers (`compareAt > price`),
  by-category (Mountain/City/Road/Kids/Accessories), featured (a small curated slug list).
- UI reads from this adapter, not raw API shapes, so a later backend improvement (a real `featured`
  flag, popularity, galleries) swaps in without rewriting components.

### 3D hero

- `components/hero/BikeHero.tsx` (client, dynamically imported, `ssr:false`) renders an R3F canvas:
  a bike model (or built fallback) under cinematic lighting on a minimal stage.
- GSAP ScrollTrigger pins the hero and scrubs the camera angle + typography as the user scrolls,
  then releases into the page. Reduced-motion → static framed shot, no pin.
- Model loaded lazily; the hero shows core copy + CTA immediately so shopping info isn't blocked.
- `Explore All Bicycles` CTA → `/shop` (catalogue).

### Files to touch (frontend only)

- **New:** `lib/catalogue.ts`; `app/(shop)/components/hero/*` (canvas, scene, fallback);
  `app/(shop)/components/home/*` (section components: CategoryExplorer, Rail, OfferBand,
  KidsBlock, AccessoriesRail, Showroom); `app/(shop)/components/Wordmark.tsx`;
  `app/(shop)/components/Wishlist*` (localStorage-only); `app/shop/page.tsx` (catalogue moves here).
- **Rewrite:** `app/(shop)/page.tsx` (homepage), `components/ProductCard.tsx`,
  `components/FilterBar.tsx`, `app/(shop)/p/[slug]/page.tsx` (detail), `(shop)/layout.tsx`
  (nav/footer), `globals.css` (big append + token layer).
- **Backend (data only):** `backend/src/seed.ts` — ~24 sample products.
- **Docs:** this spec + `build-step-1.md` + `THIRD-PARTY-ASSETS.md`; update `playbook.md` if run
  steps change.

### Rejected alternatives

- **Tailwind:** rejected — app is on hand-written CSS; adding it now is churn for no gain.
- **Framer Motion:** rejected in favour of GSAP (user choice) + native IntersectionObserver.
- **Per-variant/colour image galleries:** not built — the data has a single `image` per product;
  documented as future backend work instead of faked.

### Wishlist

- No wishlist backend exists. Build a **localStorage-only** wishlist (per-browser), clearly a
  frontend convenience, documented as such. No invented API.

## 5. Tasks

- [x] Install deps (three, @react-three/fiber, @react-three/drei, gsap, @types/three).
- [x] Source + licence-verify a bike 3D model; CC-BY Poly/Google bike, attributed in footer + register.
- [x] Expand the seed to ~25 clearly-sample bikes (data only).
- [x] Design-system token layer + global styles (new `app/redesign.css`).
- [x] `lib/catalogue.ts` adapter (honest rails).
- [x] 3D hero (R3F canvas + GSAP ScrollTrigger + reduced-motion/mobile + WebGL fallback).
- [x] Homepage sections (category, editorial, new arrivals, staff picks, budget, offers, kids, accessories, showroom).
- [x] Redesign product cards (+ wishlist action, colour preview, offer/out-of-stock states, quick-add).
- [x] Redesign catalogue page + filters (search, category, price, sort, clear, empty/error states).
- [x] Redesign product detail (zoom image, variant pills, specs, honest states, add-to-cart, related).
- [x] Redesign nav + footer (wordmark + bike symbol; honest store facts + CC-BY credit).
- [x] Light refresh on cart/checkout/account so they match; dropped unconfirmed "free shipping".
- [x] Reduced-motion, keyboard, focus, alt text, contrast, tap targets.
- [x] Verify: typecheck (FE+BE) + production build; seed + live run + browser screenshots (Atlas IP whitelisted).
- [x] Walkthrough in `build-step-1.md`; update spec `Updates` log + index statuses.

## 6. Updates

- **2026-10-18** — Spec created after two grill rounds. All forks resolved; build starting.
- **2026-10-18** — Build step 1 shipped: full redesign (cinematic hero v1, editorial homepage with
  all rails, redesigned cards/catalogue/detail, wishlist, honest footer, 25-product seed). Verified
  live on Atlas. See `build-step-1.md`.
- **2026-10-18** — Build step 2 shipped after feedback that the 3D was too flat: **cinematic hero v2**
  (studio reflections + reflective floor + bloom/vignette post + multi-beat scroll sequence with
  crossfading headlines), **a second 3D moment** (brand turntable), and a **3D-forward homepage** —
  the product rails moved to **dedicated collection pages** (`/collections/*`) linked from a
  collections strip. Added `@react-three/postprocessing`. Off-screen render pausing for performance.
  Verified live. See `build-step-2.md`.

## 7. Explanation

_Added in the change that finishes the work — see [`build-step-1.md`](build-step-1.md)._
