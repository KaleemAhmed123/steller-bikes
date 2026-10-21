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
| **Admin UI polish** — presentation-only pass on the back-office: 260px sidebar + mobile slide-in drawer, content widened 1100→1440px, card shadows, every table in a scrollable card, mobile-friendly across all admin pages | [`admin-ui-polish.md`](admin-ui-polish.md) | In progress | 2026-10-20 |
| **Frontend resilience** — fail-soft storefront: `safeSrc`/`SafeImage` image fallback (a bad product image shows a placeholder instead of crashing `next/image`) + `global-error` and per-area error boundaries so one page crash never downs the whole site | [`frontend-resilience.md`](frontend-resilience.md) | Shipped | 2026-10-20 |
| **App icons + white header** — storefront header → solid white (fixes a transparent-bar bug) with nav icons; thin `lucide-react` line icons across admin sidebar/actions, footer, product cards, shop filters, empty/error states; colour-coded status dots in admin tables | [`app-icons-and-white-header.md`](app-icons-and-white-header.md) | In progress | 2026-10-20 |
| **Admin category + config** — config-driven category list (dropdown + add/rename/delete, block-on-delete) on the settings doc; admin search on Products (server `?q=`) + Inventory (client filter); owner-only Platform tab with COD/online toggles + storefront announcement banner, server-enforced | [`admin-category-config.md`](admin-category-config.md) | In progress | 2026-10-20 |
| **Pre-launch hardening** — act on the production-readiness audit's Critical/High findings: PostCSS vuln fixed via `override` (prod deps clean), hermetic in-memory test DB (`mongodb-memory-server`), basic GitHub Actions CI, Razorpay per-order `payment_capture`; webhook (F-01) accepted as documented debt, Atlas lockdown left to owner | [`prelaunch-hardening.md`](prelaunch-hardening.md) · [`production-readiness-audit.md`](production-readiness-audit.md) | In progress | 2026-10-21 |
| **Frontend Sprint 1 — P1 audit fixes** — the 6 release-blocking fixes from the production-readiness audit: mobile icon-only header, nav contrast, homepage h1 + heading order, remove hydration-mismatch script, skip link, shared error toast (+ cart stepper lock), and an ESLint 9 flat-config baseline with jsx-a11y. Verified: lint/typecheck/build clean, Lighthouse A11y 100 | [`frontend-sprint-1-p1-fixes.md`](frontend-sprint-1-p1-fixes.md) | Shipped | 2026-10-21 |

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
