# Storefront pre-launch audit + fixes

## 1. Task

- **Name:** Storefront pre-launch audit + fixes
- **Status:** In progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

Raise the buyer-facing storefront to production quality before launch. Audit first (done),
then fix every real gap found. Server stays the authority on price/stock/totals; the editorial
design system (ElevenLabs + Rapha/Aesop, "Stellar Bikes" brand) does not change.

## 2. What you asked for

- Full frontend audit of the storefront, ranked by impact.
- Then: **fix everything** — all phases, not a subset.
- Match the locked design direction, no new design language.
- Ponytail: smallest change that works, reuse components, no new deps for a few lines.
- Spec-driven: this file lands before/with the code.

## 3. Open questions (answered)

1. **Brand name** — storefront shows "Stellar Bikes" everywhere, repo is "Raju Cycles".
   → **Answer: keep "Stellar Bikes".** It is consistent across layout, metadata, footer
   (`stellarbikes.in`), and the Razorpay popup. Treated as the go-to-market name. No rename.
2. **What `tracking` means** — courier AWB (air waybill = a courier's parcel number) or free text?
   → **Answer: show it as plain text** plus a "contact us" line. No courier deep-links (we don't
   commit to one courier yet).
3. **Scope** — all phases or launch-critical only?
   → **Answer: all 4 phases** (user said "fix everything").

## 4. Plan

### The audit (what's real, verified against the code)

Already built and good (do **not** touch): URL-driven search/filter/sort, wishlist (`/saved`),
order history + address book (`/account`), password reset, email verify, honest variant/stock/sale
picker, empty + error states on shop/collections, server-authoritative checkout + Razorpay verify.

Real gaps, ranked:

- **HIGH — order tracking invisible to the buyer.** Backend stores `fulfillmentStatus` (7 stages),
  `tracking`, `paymentStatus` (incl. refunded). Admin sets all of them. The buyer's `order/[id]`
  page shows none — no status, no tracking number.
- **HIGH — the order page lies to returning customers.** `order/[id]` is both the just-placed
  confirmation and the view-a-past-order screen, but it hard-codes "Order confirmed" and shows no
  date / status / itemized totals.
- **MEDIUM — no branded 404 / error pages.** Only one `loading.tsx`; no `not-found.tsx`, no
  `error.tsx`. Bad URL or a thrown error = Next.js default screen, off-brand.
- **MEDIUM — raw `<img>` everywhere, no `next/image`.** No format conversion / responsive sizes;
  slower LCP on phones.
- **LOW — price breakdown hidden** (subtotal/discount/shipping/tax). All 0 today in `pricing.ts`,
  so harmless now; cart's "delivery charges shown at checkout" is a small broken promise.
- **LOW — collected-but-unshown data:** `payment.method`/`paidAt`, `soldCount`; inconsistent
  loading (cart has a skeleton; order/account show plain text).

### Phases (files to touch)

- **Phase 1 — Order experience (HIGH).** Rewrite `frontend/app/(shop)/order/[id]/page.tsx`: status
  timeline from `fulfillmentStatus`, tracking when present, full shipping address, itemized totals
  (subtotal/shipping/tax/discount/total), payment method + paid-at. Heading driven by status, not
  hard-coded. CSS added to `globals.css`. A loading skeleton (kills the plain-text loader).
- **Phase 2 — Safety nets (MEDIUM).** Add `frontend/app/not-found.tsx`, `frontend/app/error.tsx`
  (client), and `frontend/app/(shop)/not-found.tsx` so a bad product slug stays inside the shop
  shell. CSS reuses `.empty`.
- **Phase 3 — Images/perf (MEDIUM).** `next.config.ts`: `images.remotePatterns` for Cloudinary +
  `dangerouslyAllowSVG` (sample SVGs). Convert the many/repeated images to `next/image`:
  `ProductCard`, cart thumb, gallery thumbs. **Deliberately NOT converting** `ZoomImage` (its whole
  job is a CSS transform on the element; the wrapper fights it) or the 3D hero — marked `ponytail:`.
- **Phase 4 — Breakdown + polish (LOW).** Fix the cart delivery-copy; account loading skeleton;
  decide on `soldCount` badge (likely skip, YAGNI).

### Deliberately NOT changing

The 3D hero, the design system, filter/search, auth, wishlist, cart logic, and every server-side
price/stock/payment rule.

## 5. Tasks

- [x] Phase 1 — order experience rewrite + CSS + skeleton
- [x] Phase 2 — not-found + error pages (root + shop)
- [x] Phase 3 — next/image config + convert card + detail-zoom images
- [x] Phase 4 — cart copy fix + account skeleton + soldCount decision (skipped, YAGNI)
- [x] Build passes (`npm run build` + `tsc --noEmit`) — 25/25 pages, no type/lint errors
- [ ] Manual pass of the order flow on the running stack (needs Mongo + backend)
- [x] Section 7 walkthrough written

## 6. Updates

- **2026-10-19** — Audit completed and verified against the code; brief's "missing screens"
  assumption corrected (most already exist). Plan approved as "fix everything" (all 4 phases).
  Build started.
- **2026-10-19** — All 4 phases shipped. `tsc --noEmit` clean; `next build` green (25/25 pages).
  `soldCount` badge deliberately skipped (enhancement, not a defect). Remaining: manual click-through
  of the order flow once the backend + Mongo are running.
- **2026-10-19** — Fast-follow: order-confirmation email now points to `/account` (not a per-order
  deep-link — the order page is cookie/session-scoped, so a cold email click would 404). Touches
  `backend/src/lib/email.ts` (real-email task's file). Backend typecheck + email tests green.
  **Flagged:** the receipt still signs off "Raju Cycles" / "Your Raju Cycles order" while the
  storefront brand is "Stellar Bikes" — left as-is pending the brand-name decision (open question 1).
- **2026-10-19** — Brand decision taken as **Stellar Bikes** (every customer-facing surface already
  shows it). Aligned all customer-facing emails: order receipt subject + sign-off (`email.ts`),
  verify + reset subjects/body (`account.ts`), and the `MAIL_FROM` sender default (`config.ts`).
  Both typechecks clean; email tests green.
- **2026-10-19** — Cart empty state redesigned (user request + screenshots): was a bare floating
  dashed box with a text link; now a titled page ("Your cart") + a structured empty card (icon,
  heading, blurb) with a primary **Browse cycles** button. New `.empty-title` / `.empty .empty-cta`
  CSS (the CTA overrides `.empty a` so the button keeps its look). Frontend typecheck clean.
- **2026-10-19** — Consistency pass: Saved (wishlist) empty state upgraded to the same pattern
  (card heading + blurb + primary **Browse the catalogue** button), reusing the cart's `.empty-title`
  / `.empty-cta`. Page header kept, so the card heading is distinct ("Nothing saved yet") to avoid
  duplicating the page title. Frontend typecheck clean.

## 7. Explanation

### What changed
- The buyer's order page (`order/[id]`) went from a static "Order confirmed" receipt to a live
  order view: a status timeline, a tracking reference, the full delivery address, an itemised money
  breakdown, and the payment method/status — with the heading driven by the real status.
- Added branded 404 and error screens (root + shop shell) in place of Next.js's bare defaults.
- Product-grid and product-detail images now go through `next/image` (format conversion, correct
  sizing, lazy/priority loading).
- Honest cart delivery copy; a loading skeleton on the account page.

### Why it was needed
- The backend tracks a full order lifecycle (`fulfillmentStatus`, `tracking`, `paymentStatus`) and
  the admin sets it, but the buyer could see **none** of it, and every order — even an old delivered
  one — still read "Order confirmed". That's the biggest trust gap for a cash-on-delivery shop.
- A mistyped URL or a thrown error dropped buyers onto an unstyled dev screen.
- Raw `<img>` meant slower first paint on the phones most Kanpur buyers use.

### How it works, step by step
1. The order page fetches the order in the browser (the guest cookie is backend-origin, so only the
   browser can send it), scoped to this guest/customer — a stranger can't read someone else's order.
2. `heading()` maps the real status to a truthful title (Confirmed → Preparing → Packed → Shipped →
   Delivered; plus Cancelled / Delivery-failed / refund-due). No more hard-coded "confirmed".
3. The timeline (`<ol class="order-timeline">`) marks each stage done/active/todo from the index of
   the current `fulfillmentStatus`. Cancelled/failed orders show a notice instead of the stepper.
4. Totals render subtotal, discount (if any), delivery (Free when 0), tax (if any), and grand total.
   Shipping/tax are 0 today but the rows are ready for when `pricing.ts` turns fees on.
5. Payment panel shows the method (COD, or "Paid online · UPI/CARD/…") and a status badge reusing
   the existing `.badge` tones, plus the paid date for online orders.
6. `not-found.tsx` (shop) renders inside the shop header/footer for bad product slugs; the root
   `not-found.tsx` and `error.tsx` cover everything else — the error page offers a retry (`reset`).

### Files / functions changed
- `frontend/app/(shop)/order/[id]/page.tsx` — rewritten: `heading()`, `payLabel()`, `payBadge()`
  helpers; timeline, totals, facts, tracking, skeleton loader.
- `frontend/app/globals.css` — `.order-timeline/.order-step*`, `.order-totals/.order-total-row`,
  `.order-facts/.order-fact`, `.order-tracking`, `.page-fallback`.
- `frontend/app/not-found.tsx`, `frontend/app/error.tsx`, `frontend/app/(shop)/not-found.tsx` — new.
- `frontend/next.config.ts` — `images.remotePatterns` (Cloudinary) + `dangerouslyAllowSVG` + CSP.
- `frontend/app/(shop)/components/ProductCard.tsx`, `.../ZoomImage.tsx` — `next/image` (`fill`).
- `frontend/app/(shop)/cart/page.tsx` — honest delivery copy; ponytail note on the raw thumb.
- `frontend/app/(shop)/account/page.tsx` — skeleton loading state.

### Important decisions
- **Heading from status, not a "just placed" flag.** A fresh order is `confirmed`, so it still reads
  "Order confirmed" right after checkout — but a returning customer sees the truth. One source, no
  guessing whether the visit is the first.
- **Only card + detail-zoom images converted to `next/image`.** Those are the real LCP images; cart
  and gallery thumbs are tiny and few, left raw with a `ponytail:` note. The 3D hero is untouched.
- **`dangerouslyAllowSVG` with a locked-down CSP** — needed because the sample photos are SVG; safe
  for our first-party files + the owner's Cloudinary, and the CSP/attachment stop SVG script.
- **Skipped the `soldCount` "sold" badge** — an enhancement, not a fix (YAGNI).

### Tests / verification
- `npm run typecheck` (`tsc --noEmit`) — clean.
- `npm run build` — green, 25/25 pages generated (incl. `/order/[id]`, `/_not-found`).
- **Not yet done:** a live click-through of the order flow (needs Mongo + the backend running).

### Edge cases and limitations
- Status unknown to `STAGES` (only cancelled/delivery_failed) → handled by the notice branch, not a
  broken timeline.
- Delivery/tax rows only appear when > 0 (today they never do) — no empty "₹0.00" clutter.
- `next/image` optimises the sample SVGs as-is (no raster resizing); fine for placeholders.
- The order page is still client-fetched, so it isn't indexable — correct, order pages are private.
