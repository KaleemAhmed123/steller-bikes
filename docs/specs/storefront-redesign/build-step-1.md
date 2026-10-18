# Build step 1 — Storefront redesign (walkthrough)

**Date:** 2026-10-18 · **Status:** shipped (code + live-verified on Atlas)

This is the plain-English walkthrough of the whole redesign pass. It follows the
seven-section shape: what changed, why, how it works, files, decisions, verification,
edge cases.

---

## 1. What changed

The customer-facing storefront was re-skinned and re-built around a new design system:

- **A cinematic 3D hero** on the homepage — a real bicycle model (3D = a model you
  can light and rotate in the browser) sits on a dark stage under gold + blue
  "duotone" lighting, with oversized "RIDE / YOUR CITY" type. On desktop the hero
  **pins** (stays put) while you scroll and the camera angle eases as you go; on
  mobile it's a clean static shot (no scroll-jacking).
- **An art-directed homepage** with section-specific layouts (not one repeated grid):
  category explorer → editorial "just in" feature → New Arrivals rail → Staff Picks
  (dark) → Budget Picks → Offers band (coral) → Kids & family (teal) → Accessories →
  showroom → footer.
- **A new catalogue page at `/shop`** (the homepage used to be the catalogue) with
  category chips, search, price range, **sort** (new), live result count, and clear.
- **A redesigned product detail page** — big zoom image, honest variant picker,
  live price/stock, specs, and "More in {category}" recommendations.
- **New product cards** with colour-swatch previews, offer badges, out-of-stock
  states, a working wishlist heart, and quick-add for single-variant items.
- **A wishlist** (`/saved`) — localStorage only, clearly a per-device convenience.
- **New brand chrome** — a code-drawn bicycle wordmark, sticky header, honest footer.
- **A ~25-product sample catalogue** (seed data) across Mountain / City / Road /
  Kids / Accessories, with real discounts and multi-variant products.

**Not touched:** every backend route, schema, migration and business rule; the
cart/checkout/account/admin *flows* (they got only a light visual refresh so they
don't clash with the new look).

## 2. Why it was needed

The old storefront was a competent but conventional e-commerce template: a static
image hero and one repeating product grid. The brief wanted a distinctive,
memorable, art-directed experience — with a real 3D bicycle — that still lets a
customer discover and buy a bike. The redesign delivers that opening "wow" and a
cohesive scroll, while reusing the proven cart/checkout/account/admin underneath.

## 3. How it works, step by step

### The data path (honest by construction)
1. `lib/catalogue.ts` is a **typed adapter**. The homepage/catalogue call it instead
   of touching raw API shapes.
2. It fetches the catalogue **once** from the existing `GET /api/products`, then
   derives every homepage rail from **real fields only**:
   - New Arrivals → the API's newest-first order (`createdAt`).
   - Budget Picks → cheapest variant price, ascending.
   - Offers → variants whose `compareAt` genuinely exceeds `price`.
   - By category → the product's real `category`.
   - Staff Picks → a curated slug list (an editorial pick, labelled as such — **not**
     a "best seller" sales claim, because there is no popularity data).
3. It normalises each product into a `CardProduct` (from-price, discount %, colours,
   sizes, in-stock, sole-variant id) so the UI never depends on the raw payload — a
   later backend change swaps in here, not across components.

### The 3D hero
1. `BikeHero` (client) renders the stage, copy and CTA immediately, so shopping text
   never waits on 3D.
2. After mount (and only if WebGL is available), it lazy-loads `BikeCanvas`, which
   loads the `.glb` model (`/models/bicycle.glb`), centres + scales it, and lights it.
3. **GSAP ScrollTrigger** (a scroll-animation library) pins the hero on desktop and
   writes a 0→1 progress value; the scene eases the bike's rotation toward that value
   each frame. The headline parallaxes up as you scroll.
4. If WebGL is missing or the model fails, an error boundary swaps in a static SVG
   bike silhouette — the page never breaks. Under reduced-motion or on mobile, the
   pin/scrub is skipped entirely.

### Buying
- Product cards: single-variant items add straight to the cart (the existing
  `useCart().add`); multi-variant items say "Choose options" and link to the detail
  page — no ambiguous adds.
- Detail page: the variant picker shows **real variants** as option pills (a real
  size+colour the catalogue has), so no fake colour×size matrix is implied.
  Add-to-cart goes through the existing cart API; the existing checkout is untouched.

## 4. Files / functions changed

**New (frontend):**
- `lib/catalogue.ts` — adapter: `toCard`, `sortCards`, `loadHomeData`, `FEATURED_SLUGS`.
- `app/(shop)/components/hero/BikeCanvas.tsx` — R3F scene (model, lights, shadows, scroll-eased rotation).
- `app/(shop)/components/hero/BikeHero.tsx` — client wrapper: GSAP pin/scrub, WebGL guard, error boundary.
- `app/(shop)/components/hero/HeroFallback.tsx` — static SVG bike stand-in.
- `app/(shop)/components/home/HomeRail.tsx` — `SectionHead` + reusable horizontal `HomeRail`.
- `app/(shop)/components/home/HomeSections.tsx` — `CategoryExplorer`, `EditorialFeature`, `OfferBand`, `KidsBlock`, `Showroom`.
- `app/(shop)/components/Wordmark.tsx` — code-drawn brand wordmark + bike roundel.
- `app/(shop)/components/WishlistProvider.tsx` / `WishlistButton.tsx` / `SavedNav.tsx` — localStorage wishlist.
- `app/(shop)/components/ZoomImage.tsx` — cursor-follow image zoom on the detail page.
- `app/(shop)/shop/page.tsx` — the new catalogue route.
- `app/(shop)/saved/page.tsx` — the wishlist page.
- `app/redesign.css` — the full new design layer (tokens, hero, sections, cards, filters, detail, footer, responsive, reduced-motion).

**Rewritten (frontend):**
- `app/(shop)/page.tsx` — now the cinematic homepage (was the catalogue grid).
- `app/(shop)/components/ProductCard.tsx` — new card (client; swatches, offer/out-of-stock, wishlist, quick-add).
- `app/(shop)/components/FilterBar.tsx` — added sort + clear + result count.
- `app/(shop)/components/AddToCart.tsx` — option-pill variant picker, live price/stock.
- `app/(shop)/p/[slug]/page.tsx` — redesigned detail page.
- `app/(shop)/layout.tsx` — new header (wordmark, Saved count) + honest footer + WishlistProvider; dropped the global `.container` wrapper so the hero can go full-bleed.
- `app/(shop)/loading.tsx` — skeleton matches the new grid width.
- `app/layout.tsx` — imports `redesign.css`.

**Touched (legacy, light):**
- `cart/page.tsx`, `checkout/page.tsx`, `order/[id]/page.tsx`, `account/page.tsx` — `/`→`/shop` shop links; removed the unconfirmed "Free shipping" promise (kept COD, which the server really applies).

**Backend (DATA ONLY — no route/schema/logic change):**
- `src/seed.ts` — rewritten to ~25 clearly-sample products with multi-variant data,
  real `compareAt` discounts, a couple of out-of-stock/low-stock variants, and
  staggered `createdAt` (bikes newest) so "New Arrivals" ordering is real.

**Assets:** `public/models/bicycle.glb` (CC-BY, attributed), `public/images/sample-kids.svg`, `public/images/sample-accessory.svg`.

**Dependencies added (frontend):** `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@types/three`.

## 5. Important decisions

- **Kept plain CSS, no Tailwind.** The app already uses one hand-written stylesheet;
  a new `redesign.css` layer is cleaner than adding a build-time CSS framework.
- **Real CC-BY model + fallback, as chosen.** Found a licence-clean Poly/Google
  bicycle, attributed it in the footer + asset register. Error boundary falls back to
  an SVG if 3D can't run. Rejected a procedural bike (looks like a toy) and a
  licence-unknown download.
- **GSAP (your choice) over hand-rolled scroll** for the pinned cinematic scrub.
- **Staff Picks, not Best Sellers.** No popularity data exists, so the section is an
  honestly-named editorial pick. Offers show only real `compareAt` discounts.
- **Discrete variant pills, not a colour×size matrix.** The data has discrete
  size+colour variants; faking two independent axes would imply stock that doesn't
  exist.
- **Wishlist is localStorage-only** — there is no wishlist backend, and this is
  documented in-UI ("saved on this device only").
- **Seed is data, not logic** — expanding it respects the no-backend-change rule while
  giving the design real content to run on.

## 6. Tests / verification (actually run)

- **Backend typecheck** (`tsc --noEmit`): clean.
- **Frontend typecheck** (`tsc --noEmit`): clean.
- **Frontend production build** (`next build`): clean — all 18 routes. Homepage first-
  load JS **112 kB**; Three.js + GSAP are code-split into async chunks that load after
  the hero mounts, so they don't block first paint.
- **Live run on MongoDB Atlas** (IP whitelisted): seeded 25 products; API verified to
  return them newest-first (Trail 29 leads), Kids category correct.
- **Browser checks (Chrome):** homepage hero renders the real 3D bike (desktop +
  mobile); all homepage sections render with real data; catalogue + filters; detail
  page; **add-to-cart hit the real backend — cart badge went to 1, toast fired**; cart
  page intact. Console: no errors (only an expected guest 401 and two harmless THREE
  deprecation warnings).

## 7. Edge cases and limitations

- **Single image per product** — no gallery, no per-colour image swapping. Swatches
  are previews only; this is stated on the detail page. A real gallery needs a backend
  field (see future work).
- **Sample data** — the 25 products are clearly labelled "SAMPLE". Prices/stock/
  discounts are illustrative until the real catalogue is loaded.
- **No popularity / no new-arrival flags** — "newest" is by `createdAt`; there is no
  best-seller ranking.
- **Wishlist** doesn't sync across devices or to an account (localStorage only).
- **Hero model** is ~2.4 MB and un-compressed; fine on desktop, lazy-loaded, but a
  Draco/texture pass would help slow mobile (not done — avoids adding build tooling).
- **Ports:** backend runs on **:8000** (not :3001 as an old note said); frontend on
  :3000 with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Future backend work (separate phase — not done here)

Fields/endpoints that would let the frontend drop its honest workarounds:
1. **Product images: a gallery array + per-variant image** → real multi-image galleries and swatch-to-image swap.
2. **A `featured` flag** → replace the curated `FEATURED_SLUGS` constant.
3. **Popularity / sales count** → a genuine "Best sellers" section + a "popularity" sort.
4. **A `newArrivalFrom` date or `isNew` flag** → a precise "new this month" rather than "newest in catalogue".
5. **A wishlist endpoint** (per customer) → account-synced wishlist instead of localStorage.
6. **Accessory ↔ bike relationships** → real "pairs with" recommendations instead of same-category.
7. **Store/settings doc** (address, phone/WhatsApp, delivery policy, shipping fee) → fills the "coming soon" placeholders honestly.
