# Razorpay payments

Add online payment (UPI / card / netbanking via Razorpay) alongside the existing Cash-on-Delivery.
The server stays the authority on price and stock; the client can never mark an order paid.

| Section | Where |
|---------|-------|
| Plan, open questions, checklist, walkthrough | [`build-step-1.md`](build-step-1.md) |

## Status

**In progress** — started 2026-10-18.

## Known debt (tracked, deferred on purpose)

- **Webhook safety-net — do after deploy.** Without it, a payment captured by Razorpay while the
  customer's browser dies before the verify call returns leaves money taken but no order (visible in
  the Razorpay dashboard for a manual refund/placement). The fix is a thin raw-body route that calls
  the same idempotent `finalizePaidOrder`; it needs a public URL, so it lands with the Render
  deployment. Owner decision (2026-10-19): accept this gap until deploy.
- **Refunds are manual** (Razorpay dashboard). A `refund_required` order flags the owner; issuing the
  money back is done in the dashboard. Automated refunds are a later task.
- **Observability is console logs** (`lib/log.ts`, tag `[pay]`). Swap for a structured logger when we
  add proper tooling.

## Hardened for production (2026-10-19)

- **Server-side capture confirmation.** Verify no longer trusts the signature alone — it fetches the
  payment from Razorpay and requires `status == captured`, the payment's `order_id` to match, and the
  **captured amount to equal the live cart total**. The client is never trusted for the amount.
- **No payment is ever dropped.** Cart emptied/changed in the pay window, an amount mismatch, or a
  sold-out item all record a `refund_required` order instead of erroring — so money taken always has a
  record. (This replaces the earlier "cart-window = error" debt item.)
- **Logging** across the whole path (create, signature fail, not-captured, amount mismatch, success,
  refund-required, errors) — never logs the secret or full signature.

## One-line summary of the approach

Create a Razorpay order on our API (amount computed server-side), let the browser pay in Razorpay's
popup, then **verify the signature on our server** and only *then* run the existing stock-decrement
transaction to create a PAID order. COD is untouched. No `razorpay` npm package — two small HMAC +
one `fetch` call cover it.
