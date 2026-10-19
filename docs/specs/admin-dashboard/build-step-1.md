# Build step 1 — admin dashboard

## 1. Task
- **Name:** Operator dashboard (KPIs + charts + range filters)
- **Status:** In progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

## 2. What you asked for
- A proper dashboard with beautiful elements, using a light chart library, with filters.
- Filters: **Today / 7 days / 15 days / 30 days / All**; every card and chart reflects the range.

## 3. Decisions (my call, approved direction)
- **Recharts** (light-ish, composable, no Tailwind needed, pretty defaults; admin-only so size is a
  non-issue).
- **Revenue = placed, excluding cancelled** (refund_required are cancelled fulfilment → excluded).
- **IST day boundaries** (Asia/Kolkata) so "Today" is right for Kanpur.
- **Default 30 days.** Access unchanged: owner + manager (`dashboard.read`).

## 4. Plan / what was built
### Backend
- `lib/dashboard.ts` — pure `rangeStart(range)` (→ IST start Date, or null for all) + `buildDashboard(from)`
  running the aggregates in parallel: KPIs (revenue, orders, AOV, paid, COD, online, unfulfilled),
  revenue+orders per day (gap-filled for a continuous x-axis), method split, status breakdown,
  top products, low stock (current), recent orders.
- `routes/admin.ts` — `/api/admin/dashboard` now reads `?range=` and returns `buildDashboard(...)`.

### Frontend
- `lib/types.ts` / `lib/api.ts` — new `DashboardData` shape; `dashboard(range)`.
- `app/admin/page.tsx` — range chips, KPI cards, Recharts (revenue area, orders bar, method donut,
  status bar, top-products bar), recent + low-stock tables. All refetch on range change.
- `globals.css` — chips head, KPI grid, chart cards/legend.
- Dependency: `recharts`.

**Not touching:** checkout/payments/orders logic; customer pages.

## 5. Tasks
- [x] `lib/dashboard.ts` (rangeStart + aggregates)
- [x] dashboard route reads `?range=`
- [x] `rangeStart` test
- [x] types + api
- [x] dashboard page (chips + KPIs + charts + tables)
- [x] styles
- [x] typecheck (both) + tests clean (59 tests, 58 pass, 1 skip)
- [x] walkthrough (section 7)

## 6. Updates
- **2026-10-19** — Built on approval (dashboard + Recharts + Today/7/15/30/All filters). Backend
  typecheck + 4 new rangeStart tests pass; full suite 58 pass / 0 fail. Frontend typecheck clean.
  Live browser check (and `next build`) left to the owner.

## 7. Explanation

### 1. What changed
The dashboard went from 3 numbers + two tables to a **range-filtered** operator view: 7 KPI cards,
5 charts, and the recent-orders / low-stock tables — all recomputed for **Today / 7d / 15d / 30d / All**.

### 2. Why it was needed
The owner needs to see how the shop is doing over a chosen window at a glance — money, order flow,
how people pay, what's selling, what's stuck.

### 3. How it works, step by step
1. The page sends the chosen range to `GET /api/admin/dashboard?range=`.
2. `rangeStart` turns the range into an **IST** start instant (or null for all-time).
3. `buildDashboard` runs ~6 MongoDB aggregations in parallel over orders from that instant, excluding
   cancelled orders from money/volume figures (the status chart still shows cancellations).
4. The day series is **gap-filled** so the time charts have a continuous x-axis even on quiet days.
5. The page renders KPIs + Recharts; changing the range refetches everything.

### 4. Files / functions changed
- Backend: `lib/dashboard.ts` (new — `rangeStart`, `buildDashboard`), `routes/admin.ts` (handler),
  `tests/dashboard.test.ts` (new).
- Frontend: `lib/types.ts`, `lib/api.ts`, `app/admin/page.tsx` (rewritten), `globals.css`,
  `package.json` (recharts).

### 5. Important decisions
- Recharts over a hand-rolled chart (you asked for a library) and over heavier/Tailwind-bound options.
- Revenue excludes cancelled/refund_required. IST day boundaries. Default 30d.
- Aggregations server-side (the server stays the source of truth; the client only draws).

### 6. Tests / verification
- Backend typecheck clean; `rangeStart` unit test 4/4; full suite 58 pass / 0 fail.
- Frontend typecheck clean.
- **Not run:** `next build` and the live browser render (owner to confirm) — Recharts renders
  client-side ('use client').

### 7. Edge cases and limitations
- **Low stock is "now"**, not range-scoped (stock is a current fact).
- **"All" with very old data** caps the day series at 400 points to protect the payload.
- **`recharts` audit:** 2 PostCSS advisories (build-time transitive), not force-fixed.
- Revenue basis is "placed, excl. cancelled" — not "cash actually collected"; easy to switch later.