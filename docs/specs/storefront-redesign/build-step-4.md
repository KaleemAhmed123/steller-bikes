# Build step 4 — Backend data fields for the redesign

**Date:** 2026-10-18 · **Status:** built (typecheck + tests green; `next build` pending a dev stop)

This phase closes the "Future backend work" list from
[`build-step-1.md`](build-step-1.md#future-backend-work-separate-phase--not-done-here):
real backend fields so the frontend can stop faking / placeholdering data. Sections 1–5
(task, asked-for, open questions, plan, checklist) land now; the section-7 walkthrough lands
in the same change that finishes the work.

---

## 1. Task

Make the backend return the fields the redesigned frontend is currently working around, so the
storefront reads real data instead of hardcoded lists and placeholders. Four pieces this pass:
a `featured` flag, an image-gallery field, store settings, and honest popularity.

- **Name:** Backend data fields for the redesign
- **Status:** planned
- **Started:** 2026-10-18
- **Last updated:** 2026-10-18

## 2. What you asked for

From the handoff: close the gaps in `build-step-1.md`'s future-work list. After the Q&A, the
agreed scope is:

1. **`featured` boolean** on Product → replaces the hardcoded `FEATURED_SLUGS` list in
   `catalogue.ts`. **Owner controls it via the seed/code for now — no admin toggle UI.**
2. **Image gallery**: add `images: string[]` to Product. Build a minimal gallery on the detail
   page that shows only when extra photos exist. **Seed leaves it empty** (we have no extra real
   photos — duplicating the one photo would be fake variety, against the honesty rule).
3. **Popularity / sales sort**: an honest "units sold" **read from existing orders** — not a
   counter bumped at checkout. Enables a "Most popular" sort and an optional "Popular" rail that
   only appears when real sales exist.
4. **Store settings** (address / phone / WhatsApp / hours / delivery policy): add the model +
   a public endpoint + wire the homepage Showroom to it. **Build it empty for now** — every blank
   field keeps its honest "coming soon" placeholder until the owner fills it.

**Not in scope this pass (deferred):** admin product-edit UI (to toggle `featured` from the
dashboard); account-synced wishlist endpoint (localStorage stays); admin UI to edit store settings.

## 3. Open questions (answered)

| # | Question | Recommended | Owner's answer |
|---|----------|-------------|----------------|
| 1 | How does the owner set `featured`? | Seed/code only | **Seed/code only** |
| 2 | Which optional extras this pass? | gallery only | **Gallery + popularity** (not wishlist) |
| 3 | Store-settings real data? | provide data | **Build it empty for now** |

**Settled by me (no change to a guarded path, so taken as default, named here):**
- **Popularity = read-only aggregation from orders.** Sum `items.quantity` over every order whose
  `fulfillmentStatus` is not `cancelled`, grouped by `variantId`, mapped up to the product.
  **Checkout is NOT touched** — no `soldCount` counter inside the transaction.
- **`image` stays** as the card/thumbnail photo; `images[]` is the extra gallery shots only.

## 4. Plan

### Honesty + Ponytail guardrails
- Server stays authoritative on price/stock/totals; **no change to checkout, cart, or stock**.
- Popularity is derived from real orders only → with just fake demo orders it stays near-empty,
  which is correct. It turns meaningful on its own once real orders exist.
- Gallery UI is inert until real photos are seeded (byte-identical to today when `images` empty).
- Settings endpoint returns a default empty object when no doc exists → no seed write needed,
  placeholders stay honest.

### 4a. `featured` flag (seed-controlled)
- `backend/src/models/product.ts` → `featured: { type: Boolean, default: false }`.
- `backend/src/seed.ts` → set `featured: true` on the 6 curated slugs
  (`metro-one`, `velocity-r`, `trail-29`, `cafe-roadster`, `lil-explorer-20`, `guardian-helmet`).
- `frontend/lib/types.ts` → `Product.featured: boolean`.
- `frontend/lib/catalogue.ts` → `CardProduct.featured`; `toCard` maps it; `loadHomeData` /
  `loadCollection` filter `cards.filter(c => c.featured)`; **delete `FEATURED_SLUGS`**.

### 4b. Image gallery field (empty for now)
- `product.ts` → `images: { type: [String], default: [] }`.
- `types.ts` → `Product.images: string[]`.
- `frontend/app/(shop)/p/[slug]/page.tsx` → when `images.length > 1`, render a small thumbnail
  strip + active `ZoomImage`; else the current single image. Update the "one per product" note.

### 4c. Popularity (read-only from orders)
- New `backend/src/lib/popularity.ts` (pure, testable):
  - `attachSoldCount(products, unitsByVariantId)` → returns products each with a `soldCount`
    (sum of its variants' units). Pure function, unit-tested.
- `backend/src/routes/products.ts` (list route only) → one aggregation
  `{$match: fulfillmentStatus != cancelled} → {$unwind items} → {$group _id: items.variantId, units: $sum quantity}`,
  build a `Map`, call `attachSoldCount`. `ponytail:` comment: one aggregation per catalogue
  fetch; cache or materialise a stored `soldCount` if catalogue traffic grows.
- `types.ts` → `Product.soldCount?: number`.
- `catalogue.ts` → `CardProduct.soldCount`; `toCard` maps `?? 0`; `SortKey` gains `'popular'`;
  `sortCards` sorts desc by `soldCount`; a "Popular" list is shown only where `soldCount > 0`.
- `frontend/app/(shop)/components/FilterBar.tsx` → add "Most popular" to the sort dropdown.
- Check: `backend/tests/popularity.test.ts` — `attachSoldCount` sums correctly and a cancelled
  order contributes nothing (same pure-unit style as `productQuery.test.ts`).

### 4d. Store settings (empty, placeholders stay)
- New `backend/src/models/settings.ts` → one settings doc (address line1/city/state/pin, phone,
  whatsapp, hours, deliveryPolicy, email), all default `''`.
- New `backend/src/routes/settings.ts` → `GET /api/settings`, public; returns the doc or an
  empty default if none exists.
- `backend/src/index.ts` → mount `app.use('/api/settings', settingsRouter)`.
- `frontend/lib/types.ts` → `StoreSettings` interface; `frontend/lib/api.ts` → `getSettings()`.
- `frontend/app/(shop)/page.tsx` → fetch settings, pass to `Showroom`.
- `frontend/app/(shop)/components/home/HomeSections.tsx` → `Showroom` takes settings; shows a real
  value when present, the existing "coming soon" when blank.

### Rejected / deferred
- **Admin `featured` toggle** — needs a new product-edit route + `products.update` permission +
  admin screen. Separate feature; the data gap closes with the field alone.
- **`soldCount` bumped at checkout** — rejected: touches the transaction-guarded path for no gain
  while sales are fake.
- **Wishlist endpoint** — not chosen this pass; localStorage version works.
- **Settings admin UI** — owner-only, no UI yet (matches existing owner-only actions).

## 5. Tasks

- [x] 4a `featured`: schema + seed + types + adapter (dropped `FEATURED_SLUGS`)
- [x] 4b gallery: schema + types + `ProductGallery` on the detail page (guarded on photo count) + CSS
- [x] 4c popularity: `lib/popularity.ts` + list-route aggregation + types + adapter sort + FilterBar + `/collections/popular` + test
- [x] 4d settings: model + public route + mount + types + `getSettings` + Showroom wiring
- [x] Backend typecheck clean; backend tests 30/30 (incl. 4 new); frontend typecheck clean
- [ ] `next build` — SKIPPED: `next dev` is live on :3000; building would corrupt the dev chunks. Run after stopping dev.
- [x] Section-7 walkthrough appended; README index updated; commit commands printed

## 6. Updates

- **2026-10-18** — Plan written; open questions answered (featured seed-only; gallery + popularity;
  settings empty). Popularity design settled as read-only order aggregation. Awaiting go to code.
- **2026-10-18** — Built all four pieces. Backend typecheck clean; backend tests 30/30 (4 new
  popularity tests); frontend typecheck clean. `next build` deliberately skipped — `next dev` was
  live on :3000 and a build on the same `.next` corrupts dev chunks. Note: popularity also got a
  free `/collections/popular` page; a homepage "popular" rail was intentionally NOT added (would
  need a 5th CSS theme for no asked-for gain).

## 7. Explanation

### 1. What changed
The backend now returns four kinds of real data the storefront used to fake or placeholder:
- a **`featured`** true/false on each product,
- an **`images`** array for extra gallery photos,
- a **`soldCount`** on the catalogue list (units actually ordered), and
- a public **store-settings** document (address / phone / hours / delivery).

The frontend reads all four and drops its workarounds: the hardcoded staff-pick slug list is gone,
the product page can show a photo gallery, `/shop` has a "Most popular" sort (plus a free
`/collections/popular` page), and the homepage Showroom shows real shop details when they exist.

### 2. Why it was needed
`build-step-1.md` listed these as honest workarounds: a curated slug constant stood in for a real
flag, there was one photo per product, there was no popularity signal at all, and the Showroom
showed "coming soon" because no settings existed. Closing them lets the UI show real data instead
of code-level guesses — and keeps the honesty rule (no invented bestsellers, no fake photo variety,
no made-up address).

### 3. How it works, step by step
- **Featured:** `product.featured` (default false) is set `true` on 6 slugs in the seed. The API
  already returns the whole document, so the adapter (`catalogue.ts`) just filters
  `cards.filter(c => c.featured)`. The old `FEATURED_SLUGS` constant is deleted.
- **Gallery:** `product.images` (default `[]`) holds extra photos. `ProductGallery` (a small client
  component) shows the primary image via the existing zoom, and a thumbnail strip **only when there
  is more than one photo**. With the seed leaving `images` empty, the page renders exactly as before.
- **Popularity:** the products **list** route runs one read-only aggregation over orders —
  `match fulfillmentStatus ≠ cancelled → unwind items → group by variantId, sum quantity`. That
  gives a `variantId → units` map, and the pure `attachSoldCount` helper sums each product's
  variants into a `soldCount`. The adapter exposes it; `sortCards` gains a `'popular'` branch;
  `/shop` offers "Most popular"; `/collections/popular` lists only products with `soldCount > 0`.
  **Checkout is never touched** — nothing is incremented at purchase time.
- **Settings:** a single `Settings` document (all fields default `''`). `GET /api/settings` returns
  it, or an empty default if none exists. `getSettings()` fetches it (never throws — falls back to
  empty). The homepage passes it to `Showroom`, which shows a real value per field or keeps the
  honest "coming soon".

### 4. Files / functions changed
**Backend**
- `models/product.ts` — added `images: [String]` and `featured: Boolean`.
- `seed.ts` — a `FEATURED` slug set; each doc now carries `featured`.
- `lib/popularity.ts` (new) — pure `attachSoldCount(products, unitsByVariant)`.
- `routes/products.ts` — list route runs the orders aggregation and stamps `soldCount`.
- `models/settings.ts` (new), `routes/settings.ts` (new) — the settings doc + public `GET`.
- `index.ts` — mounts `/api/settings`.
- `tests/popularity.test.ts` (new) — 4 checks on `attachSoldCount`.

**Frontend**
- `lib/types.ts` — `Product` gains `images?/featured?/soldCount?`; new `StoreSettings`.
- `lib/catalogue.ts` — `CardProduct` gains `featured/soldCount`; `toCard` maps them; `SortKey`
  gains `'popular'`; `sortCards` sorts by it; collections use the flag + a `popular` entry;
  `FEATURED_SLUGS` deleted.
- `lib/api.ts` — new `getSettings()` with an empty-store fallback.
- `components/ProductGallery.tsx` (new) — the guarded gallery.
- `p/[slug]/page.tsx` — uses `ProductGallery`; softened the "one per product" note.
- `components/FilterBar.tsx` — "Most popular" option.
- `shop/page.tsx` — accepts the `popular` sort.
- `components/home/HomeSections.tsx` — `Showroom` reads settings with placeholder fallback.
- `(shop)/page.tsx` — fetches settings, passes to `Showroom`.
- `redesign.css` — thumbnail-strip styles.

### 5. Important decisions
- **Popularity read from orders, not a checkout counter.** The guarded transaction path is left
  untouched; with only demo orders the signal is small but honest, and it becomes real on its own.
- **Gallery stays dormant.** Field + UI are ready, but the seed adds no duplicate photos — fake
  variety would break the honesty rule.
- **`featured` is seed-controlled.** No admin product-edit surface exists, and building one is a
  separate feature; the data gap closes with the flag alone.
- **Settings shipped empty.** Honest placeholders remain until the owner provides real details.
- **No homepage "popular" rail.** The sort + collection page deliver the feature; a 5th rail would
  need new CSS theme + layout for no requested gain.

### 6. Tests / verification (actually run)
- Backend `tsc --noEmit`: clean.
- Backend `npm test`: **30/30 pass**, including 4 new popularity tests.
- Frontend `tsc --noEmit`: clean.
- `next build`: **not run** — `next dev` was live on :3000; building the same `.next` corrupts dev
  chunks. Run after stopping dev.

### 7. Edge cases and limitations
- **Popularity cost:** one orders aggregation per catalogue fetch. Fine for this shop;
  `ponytail:` note in the route flags caching / a materialised counter if traffic grows.
- **Gallery** shows nothing extra until real photos are seeded into `images`.
- **Settings** have no admin editor yet — set the document directly (owner-only, matches the other
  owner-only actions with no UI).
- **`/collections/popular`** is empty until real (non-cancelled) orders exist; it has an empty state.
- **`next build` unverified** in this session (dev was running).
