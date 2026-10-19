# Admin payments

An owner-only Payments tab: capture the full online-payment record on the order, show every payment
in a filterable table, and let the owner reconcile (mark COD cash collected, mark a refund done).

| Section | Where |
|---------|-------|
| Plan, open questions, checklist, walkthrough | [`build-step-1.md`](build-step-1.md) |

## Status

**In progress** — started 2026-10-19.

## One-line summary

Add a `payment` sub-object to the order (Razorpay payment id / method / captured amount / paid-at),
persist it at verify, add owner-gated `/api/admin/payments` (list + detail + a validated status
action), and a `/admin/payments` tab with a table + detail popup.

## Decisions

- **Payment lives on the Order** (1 order = 1 payment), not a separate collection.
  Ceiling: promote to a ledger collection only if partial payments / multiple captures appear.
- **Owner-only** (`payments.manage` granted to owner, not manager) — money reconciliation.
- **Actions:** COD `unpaid → paid` (cash collected); `refund_required → refunded` (after the owner
  issues the refund in the Razorpay dashboard). Validated server-side.
- **No backfill:** orders made before this (incl. the first test payments) won't have the new fields.

## Roadmap after this (owner)

1. **Proper dashboard** (last feature).

Then: deploy → production hardening → audit → webhook.
