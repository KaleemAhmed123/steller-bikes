# Build step 1 — real email via Resend

## 1. Task

- **Name:** Real email (Resend) + order-confirmation receipt
- **Status:** In progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

## 2. What you asked for

- Replace the **mock** email (console print) with **real** sending.
- Provider: **Resend** (owner's choice).
- Make **verify** + **password-reset** real, and **add order-confirmation** emails (COD + paid online).
- Email only this round — coupons dropped, returns handled manually.

## 3. Open questions (settled)

1. **Provider** → **Resend** (owner).
2. **Order emails** → **yes**, add them.
3. **Sender identity** → config value `MAIL_FROM`; owner verifies a domain in Resend (or uses the test
   address while developing). No decision blocks the build — defaults to the console mock when unset.
4. **Should a send failure break signup/reset?** → **No.** `sendEmail` never throws; it logs and
   returns. A verify/reset/receipt that fails to send must never 500 the request or orphan an account.

## 4. Plan

- **`lib/email.ts`** — real `sendEmail()` body: POST to `https://api.resend.com/emails` with the API
  key (Bearer) and `{ from, to, subject, text }`. No key set → keep the console mock. Wrap in
  try/catch: log `[mail]` on failure, never throw. Add a pure `orderConfirmationMessage(...)` builder
  and a `sendOrderConfirmation(...)` that composes + sends.
- **`config.ts` + `.env.example`** — `RESEND_API_KEY`, `MAIL_FROM` (both optional).
- **`lib/checkout.ts`** — after a successful order (COD via `placeOrder`, paid online via
  `finalizePaidOrder`), fire the confirmation (not awaited; `sendEmail` can't throw). Not sent for
  `refund_required`.
- **`playbook.md`** — Resend setup steps (key + verified sender).
- **Test** — the pure receipt builder (subject/text correct) + that `sendEmail` with no key doesn't throw.

**Not changing:** the `EmailMessage` shape, verify/reset callers, the order flow's correctness.

### Why no SDK / why never-throw

Sending is one authenticated POST — a dependency can't justify itself (ponytail). Email is a
side-effect, never a reason to fail a paid order or an account creation, so the transport swallows and
logs its own errors.

## 5. Tasks

- [x] `config.ts` + `.env.example` — Resend keys
- [x] `lib/email.ts` — real send + mock fallback + never-throw + order builder
- [x] `lib/checkout.ts` — fire confirmation on COD + paid online
- [x] `tests/email.test.ts` — receipt builder + no-key safety
- [x] `playbook.md` — Resend setup
- [x] typecheck + tests clean (email 3/3, checkout 3/3, paid 4/4)
- [x] walkthrough (section 7)

## 6. Updates

- **2026-10-19** — Spec written; Resend + order emails approved. Build starting.
- **2026-10-19** — Built and verified. `sendEmail` now sends via Resend (one `fetch`) with a
  console-mock fallback and never throws. Verify + reset unchanged. Order-confirmation added
  (COD + paid online, method-aware wording), fired fire-and-forget after a successful order; not sent
  for `refund_required`. Typecheck clean; email + checkout + paid tests all pass.

## 7. Explanation

### 1. What changed
- Emails are now **real** (via Resend) instead of printed to the console. Account **verify** and
  **password-reset** go out for real; a new **order-confirmation receipt** is sent after every
  successful order (cash-on-delivery and paid-online).
- With **no Resend key**, everything falls back to the console mock — local dev and tests need no
  account and nothing breaks.

### 2. Why it was needed
Signup-verify and password-reset couldn't actually reach a customer (mock only), and there was no
order receipt. This unblocks real account verification and gives shoppers proof of their order.

### 3. How it works, step by step
1. A flow calls `sendEmail({ to, subject, text })` (signup, reset) or `sendOrderConfirmation(...)`.
2. If `RESEND_API_KEY` is unset → the message prints to the server console (dev mock).
3. If set → one authenticated `POST https://api.resend.com/emails` with `from = MAIL_FROM`, the
   recipient, subject, and text. On a non-2xx or network error, it **logs `[mail]` and returns** —
   it never throws, so a mail problem can't 500 a request or orphan a signup.
4. After a successful order, `checkout.ts` calls `notifyOrder(...)` **without awaiting** — the order
   response isn't delayed or risked by email. The wording differs by method: "pay cash on delivery"
   vs "payment received online".

### 4. Files / functions changed
- `lib/email.ts` — real `sendEmail` (Resend + mock fallback + never-throw); new pure
  `orderConfirmationMessage(receipt)` builder and `sendOrderConfirmation(receipt)`.
- `lib/checkout.ts` — `notifyOrder(...)` helper; fired on the COD (`placeOrder`) and paid-online
  (`finalizePaidOrder`) success paths. Not on `refund_required`.
- `config.ts` + `.env.example` — optional `RESEND_API_KEY`, `MAIL_FROM`.
- `tests/email.test.ts` — receipt builder wording/totals + no-key never-throws.
- `playbook.md` — Resend setup steps.

### 5. Important decisions
- **No SDK** — sending is one POST (ponytail).
- **Never throw** — email is a side-effect; it must not fail a paid order or account creation.
- **Order email is fire-and-forget** — no latency added to checkout, no dependence on the mail call.
- **Text-only receipt** for now — the `EmailMessage` shape is unchanged; HTML can come later if wanted.

### 6. Tests / verification
- `npm run typecheck` → clean.
- `tests/email.test.ts` → 3/3 (COD wording, online wording, no-key never-throws).
- `tests/checkout.test.ts` + `tests/finalizePaid.test.ts` → 7/7 (email hook didn't disturb the order
  flow; mock prints during the run).
- **Not run:** a real Resend send — needs the owner's key + a verified sender.

### 7. Edge cases and limitations
- **Silent mail failure** — a provider/network error is logged (`[mail]`) and swallowed, so a customer
  could miss a verify/receipt email while the request still succeeds. Acceptable for now (logged);
  a retry/queue is a later concern.
- **`refund_required` orders get no email** yet — the owner handles those manually.
- **Deliverability** depends on the owner verifying a sending domain in Resend; the test address only
  reaches the owner's own Resend account.
