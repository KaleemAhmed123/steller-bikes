# Build step 1 — admin payments tab

## 1. Task
- **Name:** Payments tab (owner-only) + richer payment capture
- **Status:** In progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

## 2. What you asked for
- A Payments tab in admin; capture every important payment field so the owner can see it properly.
- A table first, then a detail view (page or popup — my call).
- Actionable: COD is marked paid later (when cash is collected).

## 3. Open questions (settled 2026-10-19)
1. **Actions** → **actionable.** COD `unpaid → paid`; `refund_required → refunded`.
2. **Access** → **owner only** (`payments.manage`).
3. (my call) **Data** → payment sub-object on the Order, not a new collection (1:1).
4. (my call) **Detail UI** → a **popup** over the table (stay on the list while reconciling).

## 4. Plan
### Data (on the Order)
- New `payment` sub-object (online only; COD leaves it empty):
  `{ provider, razorpayOrderId, paymentId, method, amount, paidAt }`.
- Add `'refunded'` to `paymentStatus`.
- Persisted at **verify** from the Razorpay payment we already fetch (also on refund_required orders,
  so the owner knows what to refund). No backfill of old orders.

### Backend
- `models/order.ts` — `payment` sub-schema + `'refunded'` status.
- `lib/razorpay.ts` — `fetchPayment` also returns `method` + `createdAt`.
- `lib/checkout.ts` — `finalizePaidOrder(input, payment)`; store the payment sub-object on the paid and
  the refund_required order.
- `routes/checkout.ts` — pass the fetched payment through.
- `lib/payments.ts` — pure transition rules (`assertPaymentTransition`, `nextPaymentStatuses`).
- `permissions.ts` — `payments.manage` (owner only).
- `routes/payments.ts` (mounted `/api/admin/payments`, before the general admin mount):
  `GET /` (list, filters), `GET /:id` (detail), `POST /:id/status` (validated action).

### Frontend
- `types.ts` — `Payment` sub-type on `Order`.
- `lib/api.ts` — `adminApi.payments.list/get/setStatus`.
- `/admin/payments` page — table (ref · date · customer · amount · method · status) + filters + a
  **detail popup** with the full record and the status actions.
- `AdminShell.tsx` — owner-only nav link.

**Not touching:** checkout correctness, the order/fulfillment flow, customer pages.

### Rejected
- Separate Payment collection (1:1 — over-engineering now). A payment audit log / who-marked-it
  (use order `updatedAt` for now). A details page (popup keeps the list context).

## 5. Tasks
- [x] `models/order.ts` — payment sub-object + `refunded`
- [x] `lib/razorpay.ts` — method + createdAt on fetchPayment
- [x] `lib/checkout.ts` — store payment sub-object (paid + refund)
- [x] `routes/checkout.ts` — pass payment through
- [x] `lib/payments.ts` + test — transition rules
- [x] `permissions.ts` — `payments.manage` (owner)
- [x] `routes/payments.ts` + mount
- [x] `types.ts` + `lib/api.ts`
- [x] `/admin/payments` page (table + popup) + nav
- [x] typecheck (both) + tests clean (55 tests, 54 pass, 1 skip)
- [x] walkthrough (section 7)

## 6. Updates
- **2026-10-19** — Spec written; actionable + owner-only approved; payment-on-order + popup chosen.
  Build starting.
- **2026-10-19** — Built and verified. Payment sub-object now captured at verify (Razorpay payment id,
  method, captured amount, paid-at) and stored on both paid and refund_required orders. Owner-only
  `/api/admin/payments` (list + detail + validated status action) and a `/admin/payments` tab (table
  + detail popup with actions). Both typecheck clean; 3 new transition tests + the payment-record
  assertion in finalizePaid; full suite 54 pass / 0 fail.

## 7. Explanation

### 1. What changed
- Online payments now store a full **payment record** on the order (Razorpay **payment id**, **method**
  used — UPI/card/…, **captured amount**, **paid-at**), captured at verify from the Razorpay payment
  we already fetch. Previously all of that was discarded.
- New **owner-only Payments tab**: a filterable table of every payment, a **detail popup**, and two
  reconciliation actions — **mark cash collected** (COD `unpaid → paid`) and **mark refunded**
  (`refund_required → refunded`).
- Added `'refunded'` to the payment-status set.

### 2. Why it was needed
COD is paid on delivery, so the owner needs to tick it off when cash arrives; and when a payment is
captured but can't be fulfilled, he needs to record that he refunded it. Plus he couldn't see the
real payment details (id/method/amount) for reconciliation against the Razorpay dashboard.

### 3. How it works, step by step
1. At verify, after confirming capture, the route builds a payment record and hands it to
   `finalizePaidOrder`, which stores it on the order (paid or refund_required).
2. The Payments tab (`/admin/payments`, owner-only) lists orders via `GET /api/admin/payments` with
   status/method/search filters.
3. Clicking a row opens a popup that fetches `GET /api/admin/payments/:id` — full record + the
   **legal next statuses** (computed server-side), so only valid actions show.
4. An action calls `POST /api/admin/payments/:id/status`; the server **re-validates** the transition
   (`assertPaymentTransition`) before saving — the client can't force an illegal jump.

### 4. Files / functions changed
- **Backend:** `models/order.ts` (`payment` sub-schema, `refunded` status), `lib/razorpay.ts`
  (`fetchPayment` returns method + createdAt), `lib/checkout.ts` (`PaymentRecord`, stored on paid +
  refund paths; `finalizePaidOrder(input, payment)`), `routes/checkout.ts` (builds the record),
  `lib/payments.ts` (transition rules), `lib/permissions.ts` (`payments.manage`, owner-only),
  `routes/payments.ts` (list/detail/status), `index.ts` (mount). Tests: `payments.test.ts`,
  `finalizePaid.test.ts` (payment-record assertion).
- **Frontend:** `lib/types.ts` (`Payment`, `PaymentDetail`, `Order.payment`), `lib/api.ts`
  (`adminApi.payments`), `admin/payments/page.tsx` (table + modal), `AdminShell.tsx` (owner-only nav),
  `globals.css` (status pills, modal, detail grid).

### 5. Important decisions
- **Payment on the Order, not a new collection** — 1 order = 1 payment. Ceiling noted for a true
  ledger (partial refunds / multiple captures).
- **Owner-only** — money reconciliation, like Settings.
- **Transitions validated server-side** — the UI only offers legal actions, and the server enforces
  them regardless.
- **Popup over a detail page** — keeps the list + filters while reconciling.

### 6. Tests / verification
- Backend typecheck clean; `npm test` → 55 tests, 54 pass, 1 skip, 0 fail (3 new transition tests; the
  paid-order test now asserts the payment record is stored).
- Frontend typecheck clean.
- **Not run:** live browser click-through — owner to confirm (filter, open a payment, mark a COD paid).

### 7. Edge cases and limitations
- **No backfill:** orders made before this (incl. the first PhonePe test payments) have no payment
  record and show limited detail.
- **Manual refunds:** "Mark refunded" only records the owner's action — the actual refund is issued in
  the Razorpay dashboard (automated refunds are a later task).
- **No who-marked-it audit:** the order's `updatedAt` records when a status changed, not which staff
  (owner-only tab, so low risk). A payment audit log is a later concern.
