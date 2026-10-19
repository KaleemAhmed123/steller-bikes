# Specs Index

All planning and specification work, kept apart from the app's own docs. One row per task with its
status.

| Task | Folder | Status | Last updated |
|------|--------|--------|--------------|
| **Storefront rebuild** — rebuild the Raju Cycles store + admin on React + Node/Express + MongoDB, porting the proven design from the v1 prototype | [`storefront-rebuild/`](storefront-rebuild/) | In progress | 2026-10-16 |
| **Storefront redesign** — cinematic 3D hero (R3F + GSAP + reflections/bloom) + 3D-forward homepage, redesigned cards/catalogue/detail, dedicated collection pages; storefront-first, no backend change | [`storefront-redesign/`](storefront-redesign/) | Shipped | 2026-10-18 |
| **Razorpay payments** — online pay (UPI/card/netbanking) alongside COD; server-authoritative amount, signature-verified, stock decremented only after payment. Webhook deferred to deployment | [`razorpay-payments/`](razorpay-payments/) | In progress | 2026-10-18 |
| **Real email** — Resend-backed `sendEmail` (verify + reset made real) + order-confirmation receipts (COD + paid online); console-mock fallback, never throws | [`real-email/`](real-email/) | In progress | 2026-10-19 |
| **Admin notes** — free-text notes taggable to an order / product / inventory variant / general; `notes.manage` (owner + manager), reusable widget on those screens + a `/admin/notes` tab | [`admin-notes/`](admin-notes/) | In progress | 2026-10-19 |
| **Admin payments** — richer payment capture on the order (Razorpay id/method/amount/paid-at) + an owner-only `/admin/payments` tab (table + detail popup) with cash-collected / refunded actions | [`admin-payments/`](admin-payments/) | In progress | 2026-10-19 |
| **Admin dashboard** — range-filtered (Today/7d/15d/30d/All, IST) operator dashboard: KPI cards + Recharts charts (revenue, orders, method split, status, top products) + tables | [`admin-dashboard/`](admin-dashboard/) | In progress | 2026-10-19 |
| **Storefront audit + fixes** — pre-launch buyer-facing audit; fix order tracking/status for buyers, branded 404/error pages, `next/image`, price breakdown + polish | [`storefront-audit/`](storefront-audit/) | In progress | 2026-10-19 |
| **Backend production hardening** — fixes from the pre-production backend audit: enforce SESSION_SECRET in prod, compile-then-run build, zero-dep rate limiting, Order indexes, graceful shutdown + crash handlers, login-timing fix, owner-scoped idempotency, dead-code cleanup | [`backend-prod-hardening/`](backend-prod-hardening/) | Shipped | 2026-10-19 |
| **Frontend pagination** — wire the backend's `?page=&limit=` paging into the storefront + admin as infinite scroll (one hook + one "Load more" trigger) across shop, collections, account and the four admin tables; adds the one allowed backend change, a server-side catalogue `sort` | [`frontend-pagination/`](frontend-pagination/) | Shipped | 2026-10-19 |

## What "status" means

- **Planning** — spec being written, no code yet.
- **In progress** — build has started.
- **Shipped** — working and verified.

## Background

The v1 prototype lives at `C:\Users\hp\Desktop\raju-cycles` (a Cloudflare Worker + D1 app generated
by the OpenAI "Sites" platform). Its full audit is in that folder's `AUDIT-REPORT.md`. We are not
molding v1 into a new stack — we are **starting clean and carrying over its proven design** (data
model, checkout safety, pricing, order state machine, permission list). The v1 folder stays as
reference.
