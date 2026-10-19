# Real email (Resend)

Swap the mock console email for real sending via **Resend** (a developer email API), and add an
order-confirmation receipt. Keeps the shop running on the console mock when no key is set.

| Section | Where |
|---------|-------|
| Plan, open questions, checklist, walkthrough | [`build-step-1.md`](build-step-1.md) |

## Status

**In progress** — started 2026-10-19.

## One-line summary

`sendEmail()` gets a real body (one authenticated POST to Resend); verify + password-reset keep
working unchanged; a new order-confirmation email fires after COD and paid-online orders. No key →
console mock (dev unaffected). No SDK — one `fetch`.

## Backend roadmap after this (owner, 2026-10-19)

1. **Admin notes** — free-text notes the owner can write and **tag** to an order / product /
   inventory item (so he stops memorising).
2. **Payments tab** in admin.
3. **Proper dashboard** (last).

Then: **deploy → production hardening → audit → webhook**.
Dropped: coupons. Returns: handled manually by phone (not built).
