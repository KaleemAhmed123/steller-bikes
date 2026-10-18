# Build Step 3 — Cart (guest cookie cart, live pricing)

**Status:** Shipped (code level) · **Started:** 2026-10-16 · **Last updated:** 2026-10-16

> Third code step. A guest can add cycles to a cart, change quantities, and remove items, with the
> **server recomputing price and stock live** every time. The cart stores only *what + how many*.

## 1. Task

Build the guest cart: a browser-cookie cart, add/change/remove, a `/cart` page, a header cart count,
and "add to cart" on the product detail page. Checkout stays a placeholder (step 4).

## 2. What you asked for

- Build step 3 (the cart) as planned.
- UI: **features first, one premium-minimalist revamp after checkout.** Keep CSS tokens tidy now so
  the later revamp is cheap. (So: cart is built functional, not yet polished.)

## 3. Open questions — answered 2026-10-16

| # | Question | Answer |
|---|----------|--------|
| A | UI now or later? | **Features first; premium revamp after checkout.** |
| B | Build the cart now? | **Yes.** |

Defaults taken (named, idiomatic, ponytail):
- Guest identity = an **httpOnly cookie** holding `guest:<uuid>`. No new dependency — one small
  manual cookie read; Express sets cookies natively.
- Cross-site cookie: `SameSite=None; Secure` in production (Vercel ↔ Render are different sites),
  `Lax` in dev (both on localhost = same site). Driven by `NODE_ENV`.
- Cart item identity = the embedded **variant `_id`**.
- Add caps quantity at available stock. The real oversell guard is the checkout transaction (step 4).

## 4. Plan

**Data (already modelled in `context/01-domain-and-data.md`):**
`carts = { owner: "guest:<uuid>", items: [{ variantId, quantity }], updatedAt }`.

**Backend (Express):**
- `models/cart.ts` — the Cart schema.
- `lib/guest.ts` — middleware: read/create the guest cookie → `res.locals.owner`.
- `lib/cartView.ts` — **pure** `computeCartView(items, variantMap)`: live price × qty, subtotal,
  item count, per-line stock + availability flags. (Tested without a DB.)
- `routes/cart.ts` — `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:variantId`,
  `DELETE /api/cart/items/:variantId`. All Zod-validated; all return the recomputed cart view.
- `config.ts` — add `NODE_ENV` (controls cookie security). `index.ts` — `trust proxy` + mount.
- `tests/cart.test.ts` — the cart math.

**Frontend (Next.js):**
- `lib/api.ts` — browser cart calls (`credentials: 'include'` so the cookie rides along).
- `components/CartProvider.tsx` — client context holding the cart + add/update/remove; fetches once.
- `components/CartButton.tsx` — header cart link + live count.
- `components/AddToCart.tsx` — variant picker + quantity + Add, on the detail page.
- `app/cart/page.tsx` — the cart page: lines, quantity steppers, remove, subtotal, checkout
  placeholder.

**Flow (text diagram):**
```
Detail page [Add] ─▶ POST /api/cart/items ─┐
/cart qty/remove  ─▶ PATCH/DELETE ─────────┤─▶ Express: validate (Zod) → look up LIVE
Header/cart load  ─▶ GET /api/cart ────────┘   price+stock → recompute view → return
        ▲ cookie "rc_guest" (guest:<uuid>) identifies the shopper on every call
```

**Rejected alternatives:**
- *Store price in the cart* — forbidden by the core rule; price is always looked up live.
- *localStorage cart* — can't be trusted/validated server-side; a cookie + server cart can.
- *A session library now* — not needed for a guest cart; `express-session` lands with auth (step 5).

## 5. Tasks

- [x] Backend: Cart model.
- [x] Backend: guest-cookie middleware (`res.locals.owner`).
- [x] Backend: pure `computeCartView` + variant lookup.
- [x] Backend: cart routes (get/add/patch/delete), Zod-validated.
- [x] Backend: `NODE_ENV` config + `trust proxy` + mount.
- [x] Backend: cart math test (5 cases).
- [x] Frontend: cart API calls (credentials include) + types.
- [x] Frontend: CartProvider + useCart.
- [x] Frontend: header CartButton with count.
- [x] Frontend: AddToCart on detail page (replaces "coming soon").
- [x] Frontend: /cart page.
- [x] Frontend: cart CSS (on-brand, unpolished — revamp later).
- [x] Docs: scaffold tick, playbook (cart endpoints + credentials note), README.
- [x] Verify: backend typecheck + tests (12 total); frontend typecheck + build.

## 6. Updates

- **2026-10-16** — Step 3 planned and approved (features-first UI). Build started.
- **2026-10-16** — Shipped at code level. Backend typecheck clean + `npm test` 12/12 pass; frontend
  typecheck + `next build` clean. Live multi-item cart run still owner's to confirm in the browser.

## 7. Explanation (plain-English walkthrough)

### What changed
- Shoppers can now **add cycles to a cart**, **change quantities**, and **remove** items. A **cart
  count** shows in the header and a **`/cart` page** lists everything with a live subtotal.
- The cart lives **server-side**, tied to the browser by a cookie. The server **recomputes price and
  stock live** on every cart call.

### Why it was needed
- A store needs a cart before it can have a checkout. And the cart must never be the source of truth
  for money — otherwise a tampered browser could change prices. Keeping only *what + how many* in the
  cart, and looking up price live, is what makes the later checkout safe.

### How it works, step by step
1. On first load, the browser calls `GET /api/cart`. The server has no guest id for it yet, so it
   mints `guest:<uuid>`, stores it in an **httpOnly cookie** (`rc_guest`), and returns an empty cart.
2. On a product page you pick an option (variant) + quantity and click **Add**. The browser sends
   `POST /api/cart/items` **with the cookie** (`credentials:'include'`). The server validates the
   input (Zod), checks the variant exists + is published + has stock, caps the quantity at stock,
   saves the cart, and returns the **recomputed** cart.
3. The returned cart replaces the one held in the **CartProvider** (a small app-wide store), so the
   header count and the cart page update instantly.
4. On `/cart` the +/− steppers call `PATCH /api/cart/items/:variantId` (0 removes it) and Remove
   calls `DELETE`. Every response is the freshly recomputed cart — price × quantity, subtotal,
   stock flags — all from live product data.

### Files / functions changed
- **backend/src/models/cart.ts** (new) — the cart schema (`owner`, `items[{variantId, quantity}]`).
- **backend/src/lib/guest.ts** (new) — reads/creates the guest cookie → `res.locals.owner`.
- **backend/src/lib/cartView.ts** (new) — pure `computeCartView`: live price × qty, subtotal, item
  count, per-line `available`/`inStock` flags.
- **backend/src/routes/cart.ts** (new) — `GET`/`POST`/`PATCH`/`DELETE` cart endpoints; `loadVariantMap`
  pulls live variant data; all Zod-validated; all return the recomputed view.
- **backend/src/index.ts / config.ts / .env.example** — mount `/api/cart` behind `guestCart`,
  `trust proxy`, new `NODE_ENV` (cookie security).
- **backend/tests/cartView.test.ts** (new) — 5 checks on the cart math.
- **frontend** — `lib/api.ts` (cart calls with `credentials:'include'`) + `lib/types.ts`
  (`CartView`/`CartLine`); `app/components/CartProvider.tsx` (+`useCart`), `CartButton.tsx`,
  `AddToCart.tsx`; `app/cart/page.tsx`; `app/layout.tsx` wrapped in the provider; detail page swaps
  "coming soon" for `AddToCart`; cart CSS in `globals.css`.

### Important decisions
- **Cart stores no price** — looked up live every call (the rule that makes checkout safe).
- **Guest cookie, no dependency** — one small manual cookie read; Express sets cookies natively.
- **Cross-site cookie** (`SameSite=None; Secure` in prod) because frontend + backend are different
  sites; `Lax` in dev. Driven by `NODE_ENV`, with `trust proxy` for Render.
- **Add caps at stock**; the authoritative oversell guard is the checkout transaction (step 4).

### Tests / verification
- Backend: `npm run typecheck` clean; `npm test` → **12/12 pass** (5 cart + 7 catalogue).
- Frontend: `npm run typecheck` + `npm run build` clean (`/cart` builds; detail page still SSR).
- **Not verified in a live browser yet:** the end-to-end add → view → change → remove round-trip
  against Atlas (owner to confirm).

### Edge cases and limitations
- **No stock hold.** Two shoppers can both add the last unit; the real guard is the checkout
  transaction (step 4). Cart lines flag `inStock:false` when quantity exceeds stock.
- **Unavailable items** (variant unpublished/removed) show as "no longer available" and are excluded
  from the subtotal; the shopper can remove them.
- **Checkout button is a disabled placeholder** until step 4.
- UI is functional, not yet the premium revamp (that comes after checkout, by decision).
