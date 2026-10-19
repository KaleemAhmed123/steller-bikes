# Build step 3 — pagination on the growth-prone list endpoints

Plain-English walkthrough. Offset pagination (`?page=&limit=`), backend-only.

## 1. What changed
Six list endpoints now return **one page at a time** instead of every row, plus a
small `pagination` block telling the client what page it's on and whether more
exists. The old `data` array is still there (now just the current page), so the
existing frontend keeps working — it shows the first page until page controls are
wired later.

Endpoints paginated:
- `GET /api/products` — storefront catalogue
- `GET /api/admin/products` — admin product list
- `GET /api/admin/orders` — order queue
- `GET /api/admin/payments` — payments table
- `GET /api/admin/notes` — notes list
- `GET /api/orders` — customer order history

## 2. Why it was needed
Every one of these did a `find(...)` with no real bound (a couple had a flat
`.limit(200/300)`). As orders, products and notes pile up, those reads get slower
and the payloads get bigger. Pagination keeps each read small and fast no matter
how much data accumulates — the "optimize things" you asked for.

## 3. How it works, step by step
1. The client sends `?page=2&limit=24`. **page** is 1-based; **limit** is rows per
   page.
2. `parsePagination()` ([src/lib/pagination.ts](../../../backend/src/lib/pagination.ts))
   reads those, clamps them (page ≥ 1; limit between 1 and a per-endpoint max), and
   returns `{ page, limit, skip }`. **skip** = how many rows to jump over
   (`(page - 1) * limit`). Garbage input falls back / clamps instead of erroring.
3. The route runs two queries together: the page itself
   (`.sort().skip(skip).limit(limit)`) and a `countDocuments(filter)` for the total.
4. `pageMeta(total, pg)` builds `{ page, limit, total, totalPages, hasMore }`.
   **hasMore** saves the frontend the arithmetic.
5. Response shape: `{ data: [...this page...], pagination: {...} }` (products also
   still returns `categories`).

The `skip`/`sort` here ride on the Order indexes added earlier
(`{owner, createdAt}`, `{createdAt}`, status + `createdAt`), so paging stays cheap.

## 4. Files / functions changed
- **`backend/src/lib/pagination.ts`** — NEW. `parsePagination()` (+ `Pagination`)
  and `pageMeta()` (+ `PageMeta`). One home, used by every list route.
- **`backend/src/routes/products.ts`** — page the catalogue; add `countDocuments`;
  response gains `pagination` (keeps `categories`). Default 24/page, max 100.
- **`backend/src/routes/admin.ts`** — page the product list and the order queue
  (the flat `.limit(200)` on orders is gone). Default 20/page, max 100.
- **`backend/src/routes/payments.ts`** — page the payments table (flat `.limit(300)`
  gone). Default 20, max 100.
- **`backend/src/routes/notes.ts`** — page the notes list (flat `.limit(200)` gone).
- **`backend/src/routes/orders.ts`** — page customer order history (replaces the
  flat `.limit(100)` from the previous batch).
- **`backend/tests/pagination.test.ts`** — NEW. Self-check for the helper.

## 5. Important decisions
- **Offset (`page`/`limit`), not cursor** (your call) — simplest for admin tables
  and a shop this size; cursor would be overkill.
- **Backend-only, backward-compatible shape** (your call) — `data` stays the array
  so nothing on the frontend breaks; the frontend just sees the first page until
  next/prev controls are added. That UI wiring is a separate, approved follow-up.
- **Growth-prone endpoints only** (your call) — left the dashboard aggregates,
  single-doc reads (`/settings`, `/products/:slug`) and the inventory flatten alone;
  they're naturally bounded or the UI needs the whole set.
- **Lenient parsing** — a bad `?page`/`?limit` clamps/falls back rather than 400s,
  because a read shouldn't fail over a sloppy querystring.
- **Default 24 for the catalogue** (fits a product grid), **20 for admin tables**;
  **max 100** everywhere so a client can't ask for everything at once.

## 6. Tests / verification (real output)
- `tsc --noEmit` → **typecheck OK**.
- `npm run build` → **exit 0**.
- `tests/pagination.test.ts` → **pass 5 / fail 0** (defaults, skip math, max-clamp,
  bad-input fallback, `pageMeta` totals + `hasMore`).
- All no-DB suites re-run → **all green** (rateLimit 3, pagination 5, productQuery 7,
  permissions 3, razorpay 4, noteInput 4, productInput 6, popularity 4, cartView 5,
  email 2).
- Not run: live DB paging (needs Atlas); the query logic is standard skip/limit.

## 7. Edge cases and limitations
- **Deep pages** use `skip`, which gets slower the deeper you go. At this shop's
  volume it's a non-issue; if a list ever reaches tens of thousands of rows, switch
  that one endpoint to cursor (keyset) paging — a `ponytail` upgrade path, not now.
- **Frontend still shows only the first page** until the next/prev UI is added. Any
  screen that silently relied on getting *all* rows now gets the first page — the
  planned follow-up wires the controls.
- **Count cost:** `countDocuments` runs per request. Cheap at this scale; could be
  cached if a hot list ever needs it.
