# Admin dashboard

A proper operator dashboard: KPI cards + charts (Recharts) + tables, all scoped to a date range
(Today / 7d / 15d / 30d / All), computed in IST.

| Section | Where |
|---------|-------|
| Plan, decisions, checklist, walkthrough | [`build-step-1.md`](build-step-1.md) |

## Status

**In progress** — started 2026-10-19.

## One-line summary

`GET /api/admin/dashboard?range=` returns range-scoped aggregates (revenue/day, method split, status
breakdown, top products, KPIs, low stock, recent); the page renders them with Recharts and range chips.

## Decisions

- **Recharts** for charts (composable, no-Tailwind, good defaults; admin-only so bundle size is a
  non-issue). Ceiling: swap for Chart.js if ultra-light ever matters.
- **Revenue = orders placed, excluding cancelled** (refund_required = cancelled fulfilment, so
  excluded too). Switchable to paid-only.
- **IST day boundaries** so "Today" is correct for Kanpur.
- **Default range: 30 days.** Dashboard stays owner **+ manager** (`dashboard.read`, unchanged).

## Note: dependency added

`recharts@3.10.1` (frontend). `npm audit` flags 2 PostCSS advisories (build-time transitive,
source-map issues — not shipped to users); not force-fixed to avoid breakage.

## This was the last planned feature. Next: deploy → production hardening → audit → webhook.
