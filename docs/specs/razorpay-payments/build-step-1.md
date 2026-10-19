# Build step 1 — Razorpay online payments

## 1. Task

- **Name:** Razorpay online payments (alongside COD)
- **Status:** In progress
- **Started:** 2026-10-18
- **Last updated:** 2026-10-18

## 2. What you asked for

- Online pay (UPI / card / netbanking) **alongside** the existing Cash-on-Delivery — not replacing it.
- Server stays the authority on price and stock. The client can never declare an order paid.
- Keep the existing checkout safety: the stock-decrement transaction and oversell guard are reused,
  not rewritten.
- Ponytail: no new dependency for what a few lines cover.

## 3. Open questions (answered 2026-10-18)

1. **When is stock decremented for an online order?**
   Recommended + chosen: **after payment is confirmed**. Reuses the existing transaction as-is, no
   background expiry job. Rare edge case (a race for the last unit during the payment window) → the
   order is flagged `refund_required` for the owner to action by hand.
2. **Webhook safety-net now or later?**
   Chosen: **later**. Ship client-side verify first. The code is structured so the webhook is a thin
   add-on later (same idempotent finalize path). A `ponytail:` note marks the open risk window.

## 4. Plan

### Flow (text diagram)

```
Browser (checkout)                   Our API                          Razorpay
  pick "Pay online" ──────────────▶ POST /api/checkout {method:razorpay}
                                     recompute cart + total (live) ──▶ POST /v1/orders (amount)
                                  ◀── {razorpayOrderId, amount, keyId} ◀──
  open Razorpay popup, pay ─────────────────────────────────────────▶ (UPI / card / netbanking)
  success → 3 fields ─────────────▶ POST /api/checkout/verify
                                     verify HMAC signature
                                     ✅ → finalizeOrder(): decrement stock
                                          + create PAID order + clear cart
                                  ◀── {orderId}
  redirect to /order/[id]
```

### Why stock is decremented only after payment

Reserving stock when payment *starts* would need a timeout job to release it from abandoned
payments — more code and a background task. Decrementing after payment reuses the existing
transaction untouched. The one risk: two shoppers race for the last unit during the ~30s payment
window → one pays but we can't fulfil → that order is flagged `refund_required` (a status the model
already had).

### Files to touch

**Backend**
- `lib/razorpay.ts` **(new)** — `createRazorpayOrder(amountPaise, receipt)`, `verifyPaymentSignature(...)`,
  `razorpayConfigured()`. Uses `fetch` (Node 20 global) + `node:crypto` HMAC. No SDK.
- `lib/checkout.ts` — extract the recompute + transaction into a shared `finalizeOrder(...)`; both COD
  and the Razorpay-verify path call it. `placeOrder` (COD) keeps its exact behaviour.
- `routes/checkout.ts` — accept `method: 'cod' | 'razorpay'`; for razorpay return the created order
  details; add `POST /api/checkout/verify`.
- `config.ts` + `.env.example` — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (both **optional**, like the
  Cloudinary keys; absent → online pay is simply off).

**Frontend**
- `lib/api.ts` — `createRazorpayOrder(...)`, `verifyRazorpayPayment(...)`, `razorpayKeyId` carried in
  the create response.
- `(shop)/checkout/page.tsx` — a COD / Pay-online choice (default COD); on Pay-online, load Razorpay's
  `checkout.js` on demand, run create → pay → verify → redirect.
- `(shop)/order/[id]/page.tsx` — show "Paid online" vs "Cash on delivery".

**Not changing:** COD behaviour, pricing rules, the oversell guard, admin beyond showing the statuses
it already renders.

### Rejected alternatives

- **`razorpay` npm package** — rejected. Order-create is one authenticated POST; signature check is one
  HMAC. A dependency can't justify its line in `package.json` here.
- **Reserve stock at payment start** — rejected (needs an expiry job). See above.
- **Store a `pending` order in our DB at step 1** — rejected. Keeps stale unpaid rows; the address is
  re-sent at verify instead (address is the customer's own delivery info, not a price/stock trust
  boundary, which stay server-recomputed).

## 5. Tasks

- [x] `lib/razorpay.ts` — create-order + verify-signature + configured check
- [x] `config.ts` + `.env.example` — optional Razorpay keys
- [x] `lib/checkout.ts` — shared `finalizeOrder`, COD reuses it
- [x] `routes/checkout.ts` — razorpay order + `/verify` sub-routes
- [x] backend test — signature verify accepts valid, rejects tampered
- [x] `lib/api.ts` — create + verify client calls
- [x] `checkout/page.tsx` — payment choice + Razorpay popup flow
- [x] `order/[id]/page.tsx` — paid / refund-due / COD labels
- [x] `npm run typecheck` (both) + `npm test` (backend checkout + razorpay) clean
- [x] walkthrough written (section 7)

## 6. Updates

- **2026-10-18** — Spec written. Plan approved: after-payment stock decrement, webhook deferred.
- **2026-10-18** — Built and verified. Backend + frontend typecheck clean; the 4 new signature tests
  and the 3 existing COD checkout tests pass. Routes landed as `POST /api/checkout/razorpay/order`
  and `POST /api/checkout/razorpay/verify` (COD's `POST /api/checkout` is unchanged). Browser test of
  the pay flow is left for the owner once test keys are set (needs a Razorpay account).
- **2026-10-19** — Owner added test keys. Webhook confirmed deferred to post-deploy and logged as
  tracked debt (see README "Known debt"). Manual (browser-based) test steps handed to the owner.
- **2026-10-19** — PhonePe test wallet payment succeeded end to end. Production-hardening pass (owner
  approved "all of it"):
  1. **Server-side capture + amount check** — `verify` now fetches the payment from Razorpay
     (`fetchPayment`) and requires `status == captured`, matching `order_id`, and captured amount ==
     live cart total. Signature alone is no longer trusted as proof of payment.
  2. **No payment ever dropped** — `finalizePaidOrder` now takes the captured amount and records a
     `refund_required` order for every non-clean outcome (cart empty/changed, amount mismatch, sold
     out). The old "cart-window = error" debt item is closed.
  3. **Logging** added (`lib/log.ts`, tag `[pay]`) across create + verify, incl. failures.
  4. Minor: `recordRefundRequired` is idempotency-safe; create's raw Razorpay error no longer reaches
     the client (logged, generic 500).
  New tests: `finalizePaid.test.ts` (happy / amount-mismatch / sold-out / idempotent). All backend
  tests pass (11), typecheck clean.

## 7. Explanation

### 1. What changed

- Customers can now **pay online** (UPI / card / netbanking) at checkout, next to the existing
  Cash-on-Delivery. A radio choice on the checkout page picks one.
- Online pay is **off until keys are set**. No Razorpay keys → the option simply doesn't appear and
  COD works exactly as before.
- **No new dependency** — the whole Razorpay integration is one `fetch` call + two HMAC hashes using
  Node's built-in `crypto`.

### 2. Why it was needed

COD-only means every sale waits on cash at the door — no prepaid orders, more failed deliveries.
Online pay lets customers commit money up front. The hard requirement: the **server**, never the
browser, decides the amount and whether a payment is real.

### 3. How it works, step by step

1. Customer fills the checkout form and picks **Pay online**.
2. Browser calls `POST /api/checkout/razorpay/order`. The server recomputes the cart total from live
   prices (`computeCartTotal`) and asks Razorpay to create a payment order for that amount. It returns
   the Razorpay order id, the amount, and the public key id. **No stock is touched yet.**
3. Browser loads Razorpay's hosted `checkout.js` on demand and opens their popup. The customer pays
   inside Razorpay's own window — card/UPI details never touch our page.
4. On success Razorpay hands the browser three values: a payment id, the order id, and a **signature**
   (a hash it signed with our secret).
5. Browser sends those three (plus email + address) to `POST /api/checkout/razorpay/verify`. The
   server re-computes the signature with its secret — a match proves the payment is genuine and
   unaltered. A tampered or forged payload is rejected.
6. Only then does the server run the **existing** checkout transaction: decrement stock (with the
   atomic oversell guard), create the order as `method: razorpay, paymentStatus: paid`, and clear the
   cart. The Razorpay order id is the idempotency key, so a retried verify can't make a second order.
7. Browser redirects to the order confirmation page, which now shows "Paid online".

### 4. Files / functions changed

**Backend**
- `lib/razorpay.ts` **(new)** — `razorpayConfigured()` (both keys present?), `razorpayKeyId()`,
  `createRazorpayOrder(amountPaise, receipt)` (one authenticated POST to `/v1/orders`),
  `verifyPaymentSignature(orderId, paymentId, signature)` (HMAC-SHA256 compare, timing-safe).
- `lib/checkout.ts` — the recompute + the stock transaction were pulled into one private
  `finalizeOrder(...)`. `placeOrder` (COD) and the new `finalizePaidOrder` (online) both call it.
  Added `computeCartTotal(owner)` for the create step. Added the **paid-but-out-of-stock** fallback:
  if the money is taken but the last unit just sold, it records a `refund_required` order instead of
  dropping the payment.
- `routes/checkout.ts` — `POST /razorpay/order` (create) and `POST /razorpay/verify` (verify). COD's
  `POST /` is byte-for-byte the same behaviour.
- `config.ts` + `.env.example` — optional `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
- `tests/razorpay.test.ts` **(new)** — 4 asserts on the signature check.

**Frontend**
- `lib/api.ts` — `createRazorpayOrder()`, `verifyRazorpayPayment(...)`, `razorpayEnabled()` (UI flag).
- `(shop)/checkout/page.tsx` — payment radio, on-demand `checkout.js` loader, the create→pay→verify
  flow. COD path unchanged.
- `(shop)/order/[id]/page.tsx` — "Paid online" / "Paid online — refund due" / "Cash on delivery".
- `globals.css` — `.pay-methods` / `.pay-option` styling.

### 5. Important decisions

- **Stock decremented after payment, not reserved at pay-start.** Reserving would need a background
  job to free stock from abandoned payments. Decrementing after payment reuses the existing
  transaction untouched. Accepted trade: the rare last-unit race → a `refund_required` order.
- **No `razorpay` npm package.** Create = one POST; verify = one HMAC. A dependency can't justify
  itself here.
- **Verify re-sends address, not price.** Address is the customer's own delivery info (not a trust
  boundary); price and stock are always recomputed server-side.
- **Rejected:** storing a pending order at pay-start (leaves stale rows), and the SDK.

### 6. Tests / verification

- `backend: npm run typecheck` → clean.
- `backend: node --test tests/razorpay.test.ts` → 4/4 pass (valid accepted; tampered, wrong-length,
  and wrong-order signatures all rejected).
- `backend: node --test tests/checkout.test.ts` → 3/3 pass (oversell race, idempotency, empty cart) —
  confirms the COD refactor kept its behaviour.
- `frontend: npm run typecheck` → clean.
- **Not yet run:** the live browser pay flow — needs Razorpay test keys (owner's setup step).

### 7. Edge cases and limitations

- **No webhook yet (deferred by choice).** If the customer pays but their browser dies before the
  verify call returns, the payment is captured by Razorpay but no order is created. The payment is
  visible in the Razorpay dashboard for a manual refund/placement. The webhook (a thin add-on calling
  the same idempotent `finalizePaidOrder`) closes this; it needs a public URL, so it lands with
  deployment.
- **Cart changed in the pay window → EMPTY/CHANGED at verify.** Rare (same browser just paid). It
  currently surfaces as an error; the payment shows in the dashboard for a manual refund. Marked with
  a `ponytail:` note; upgrade path is to snapshot the cart at pay-start.
- **Refunds are manual.** A `refund_required` order flags the owner; issuing the refund is done in
  the Razorpay dashboard (automated refunds are a later task).
