# Build Step 4 — Checkout (COD, transactional, safe)

**Status:** Shipped (code level; safety test green on Atlas) · **Started:** 2026-10-16 ·
**Last updated:** 2026-10-16

> The one hard path. A guest places a cash-on-delivery order. The **server recomputes all totals**,
> and order-creation + stock-decrement + cart-clear happen in **one transaction** with an **atomic
> stock guard** (no overselling) and an **idempotency key** (no double orders). Ships with a safety
> test.

## 1. Task

Build COD checkout: an address form, server-recomputed totals, the transactional order placement,
an order confirmation page, and a concurrency safety test.

## 2. What you asked for

- "Move to step 4."
- Shipping/tax: **free shipping, no tax** for MVP.
- Inventory audit log: **defer to step 5.**
- COD max value + serviceable-PIN check: **skip for MVP** (accept any valid 6-digit PIN / any value).
- Safety test: **run against Atlas** (a separate `raju-cycles-test` database), no new dependency.

## 3. Open questions — answered 2026-10-16

| # | Question | Answer |
|---|----------|--------|
| A | Shipping / tax? | **Free shipping, no tax** (constants now; settings screen in step 6). |
| B | Inventory movements at checkout? | **Defer to step 5.** |
| C | COD limit / PIN serviceability? | **Skip for MVP** (note as step-6 settings). |
| D | Safety-test harness? | **Atlas, `raju-cycles-test` db**, skipped if `MONGODB_URI` unset. |

Defaults taken (named): order reference shown to the customer = last 8 chars of the Mongo id
(a friendly sequential number is a later nicety); email collected at checkout + stored (no sending
yet); order confirmation page fetched client-side (the guest cookie belongs to the backend origin,
so Next's server can't read it — all cart/order calls stay browser-side).

## 4. Plan

**Flow:**
```
/checkout {address,email,idempotencyKey} ─POST /api/checkout─▶ placeOrder()
  1. existing order for this key? → return it (idempotent)
  2. load cart (cookie) → recompute LIVE prices + stock
  3. any item missing / short → 409 "review your cart"
  4. totals = subtotal (free shipping, no tax)
  5. TRANSACTION: for each item, atomic guarded decrement
       {variants:$elemMatch:{_id, stock:≥qty}} $inc stock −qty ; 0 matched → abort
     insert order (prices snapshotted) ; clear cart
  6. → /order/<id>   (COD, unpaid, confirmed)
```

**Backend:**
- `models/order.ts` — Order schema (snapshotted items; paise totals; `method:'cod'`,
  `paymentStatus:'unpaid'`, `fulfillmentStatus:'confirmed'`; **unique `idempotencyKey`**).
- `lib/pricing.ts` — `computeTotals(subtotal)` → free shipping / no tax / no discount (pure).
- `lib/variants.ts` — `loadVariantMap` moved here and shared by cart + checkout.
- `lib/checkout.ts` — `placeOrder(input)`: idempotency + live recompute + the transaction + guard;
  throws typed `CheckoutError('EMPTY'|'CHANGED'|'OUT_OF_STOCK')`.
- `routes/checkout.ts` — `POST /api/checkout` (Zod address/email/key → `placeOrder` → HTTP).
- `routes/orders.ts` — `GET /api/orders/:id` (guest reads only their own, by cookie owner).
- `tests/checkout.test.ts` — Atlas-gated: last-unit race → exactly one wins, stock never negative,
  one order; same key twice → one order.

**Frontend:**
- `app/checkout/page.tsx` — address form + live summary; one idempotency key per attempt; on success
  routes to the confirmation and refreshes the (now empty) cart.
- `app/order/[id]/page.tsx` — confirmation (reference, items, total, COD note).
- `/cart` "Checkout" button → `/checkout`. `CartProvider` gains `refresh()`.

**Rejected / deferred:** Razorpay, coupons, order emails, the fulfillment state machine + admin
(step 5), returns, COD limit, PIN serviceability, inventory movements.

## 5. Tasks

- [x] Backend: Order model (unique idempotencyKey).
- [x] Backend: pricing (free shipping/no tax) + test-friendly pure fn.
- [x] Backend: extract `loadVariantMap` to `lib/variants.ts`; cart uses it.
- [x] Backend: `placeOrder` (transaction + guard + idempotency).
- [x] Backend: checkout + orders routes; wire into app.
- [x] Backend: Atlas-gated safety test (race + idempotency + empty cart).
- [x] Frontend: checkout page + order page; cart button; `refresh()`.
- [x] Docs: scaffold tick, playbook (endpoints + test note), README.
- [x] Verify: backend typecheck + 15 tests (3 hit Atlas); frontend typecheck + build.

## 6. Updates

- **2026-10-16** — Step 4 planned; open questions A–D answered; build started.
- **2026-10-16** — Shipped at code level. **Safety test passed against real Atlas:** two concurrent
  buyers of the last unit → exactly one order, stock lands at 0 (never negative); same idempotency
  key twice → one order; empty cart rejected. Backend 15/15 tests pass; frontend typecheck + build
  clean. End-to-end browser run (fill form → confirmation) still owner's to click through.

## 7. Explanation (plain-English walkthrough)

### What changed
- A guest can now **place a cash-on-delivery order**. There's a **checkout page** (address + live
  order summary) and an **order confirmation page**.
- The server creates the order, **reduces stock**, and **empties the cart** as one all-or-nothing
  step, and it **can't oversell or double-order**.

### Why it was needed
- The whole store exists to take orders. This is also the one path where money and stock can go
  wrong, so it's built to be provably safe — that's what the safety test guarantees.

### How it works, step by step
1. On `/checkout` the browser generates a one-time **idempotency key** and the shopper fills their
   address. Submitting sends it + the key to `POST /api/checkout` with the guest cookie.
2. The server first checks: **is there already an order for this key?** If yes, it returns that one
   (a double-click makes no second order).
3. It loads the cart and **recomputes prices + stock from live product data**. If any item vanished
   or is short on stock, it stops with a "review your cart" message — nothing is charged or reserved.
4. It opens a **transaction** and, for each item, runs an **atomic guarded decrement**: "find a
   variant that still has at least this many in stock, and subtract." If that matches nothing, stock
   ran out → the whole transaction aborts and nothing is written.
5. Still inside the transaction it **creates the order** (copying each item's name/sku/price so
   history never changes) and **clears the cart**. Commit = all of it; abort = none of it.
6. The browser lands on `/order/<id>`, which fetches the order (scoped to this guest) and shows the
   reference, items, total, and the cash-on-delivery note.

### Files / functions changed
- **backend/src/models/order.ts** (new) — Order schema; snapshotted items; unique `idempotencyKey`.
- **backend/src/lib/pricing.ts** (new) — `computeTotals` (free shipping, no tax — MVP constants).
- **backend/src/lib/variants.ts** (new) — `loadVariantMap`, now shared by cart + checkout.
- **backend/src/lib/checkout.ts** (new) — `placeOrder`: idempotency + live recompute + the
  transaction + atomic guard; throws `CheckoutError('EMPTY'|'CHANGED'|'OUT_OF_STOCK')`.
- **backend/src/routes/checkout.ts** (new) — `POST /api/checkout` (Zod address/email/key → HTTP).
- **backend/src/routes/orders.ts** (new) — `GET /api/orders/:id`, scoped to the guest cookie owner.
- **backend/src/index.ts** — mount `/api/checkout` + `/api/orders` behind `guestCart`.
- **backend/src/routes/cart.ts** — now imports the shared `loadVariantMap`.
- **backend/tests/checkout.test.ts** (new) — the Atlas-gated safety tests.
- **frontend** — `lib/api.ts` (`checkout`, `getOrder`) + `lib/types.ts` (`Order`/`Address`);
  `app/checkout/page.tsx`, `app/order/[id]/page.tsx`; `CartProvider` gains `refresh()`; `/cart`
  button links to `/checkout`; checkout/order CSS.

### Important decisions
- **Transaction + atomic guard + idempotency** carried straight from the v1 design — the three
  together are what make checkout safe. Proven by the Atlas safety test.
- **Totals always recomputed server-side**; items snapshotted into the order.
- **Order confirmation fetched client-side** — the guest cookie is for the backend origin, so Next's
  server can't read it; the browser can.
- **Free shipping / no tax** are MVP constants in `lib/pricing.ts`, moving to the settings screen in
  step 6 without changing the shape.

### Tests / verification
- Backend: `npm run typecheck` clean; `npm test` → **15/15 pass**, incl. 3 that run a real
  transaction against Atlas (`raju-cycles-test` db): last-unit race, idempotency, empty cart.
- Frontend: `npm run typecheck` + `npm run build` clean (checkout static shell; order page dynamic).
- **Not yet clicked through in a browser:** fill the form → see the confirmation (owner to confirm).

### Edge cases and limitations
- **COD only.** No online payment, no coupons, no order emails yet.
- **No fulfillment UI** — orders are created as `confirmed`/`unpaid`; the admin + state machine are
  step 5.
- **No COD max value or PIN serviceability** (skipped for MVP; settings in step 6).
- **"Changed cart" at checkout** (price/stock moved) returns a clear error asking to review the cart
  — nothing is charged or reserved.
