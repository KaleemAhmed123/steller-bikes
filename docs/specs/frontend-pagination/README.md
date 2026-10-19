# Frontend pagination — infinite scroll over the shipped backend paging

One line: wire the backend's `?page=&limit=` paging into the storefront + admin as
**simple infinite scroll** (append on scroll) with an accessible **"Load more"** button
fallback — one reusable hook, one reusable trigger, applied to 7 screens.

Status: **shipped** (code + typecheck + unit tests; live DB/browser test pending on your side) · Started 2026-10-19 · Last updated 2026-10-19

## Index

| Doc | What |
| --- | --- |
| `build-step-1.md` | The whole feature: plan, the two decisions, per-screen write-up, verification. |

## The two decisions (locked with the owner)

1. **Shop sort = server-side (option A).** `GET /api/products` now takes
   `sort=newest|price-asc|price-desc|popular` and sorts the *whole* catalogue in the
   database before paging, so infinite scroll is globally correct. Needed an
   aggregation (min-variant-price and sold-units aren't stored fields) — the one
   allowed backend change.
2. **Collections derived rails = big single page.** `new-arrivals` and `budget` get
   true infinite scroll; `staff-picks` / `offers` / `popular` fetch one page of
   `limit=100` and derive client-side (the backend can't filter featured / on-offer /
   sold). Capped at 100 source products — fine at this shop's scale.
