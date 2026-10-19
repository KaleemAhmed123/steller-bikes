# Build step 1 — infinite scroll across the storefront + admin

## 1. Task

- **Name:** frontend-pagination
- **Status:** in progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

## 2. What you asked for

Wire the already-shipped backend paging (`?page=&limit=` → `{ data, pagination }`) into
the frontend as **simple infinite scroll**. Constraints you set:

- Server stays the authority on price/stock/totals; the client never computes them.
- Match the existing design system / ProductCard / table styles — no new UI library.
- Accessible: keyboard-reachable "Load more", respects `prefers-reduced-motion`,
  announces new items (`aria-live` on the count).
- Don't regress SSR/SEO on shop + collections (first page server-rendered).
- Handle loading + error; a failed `loadMore` shows retry, never a blank.
- De-dupe by id defensively (no duplicate items when pages overlap).
- Order: shop (primary) → collections → account → the four admin tables, verify each.
- One reusable hook + one reusable trigger component used everywhere.
- Don't touch the backend except the one optional `sort` decision.

## 3. Open questions (answered)

1. **Shop sort with paging.** → **A, server-side sort.** The catch surfaced on reading:
   `fromPrice` (cheapest variant) and `soldCount` (units sold) are *not stored fields*,
   so Mongo's plain `.sort()` can't order by them — option A means an aggregation, not a
   one-line param. Owner chose A (correct at any scale) over B (client sort capped at 100).
2. **Collections derived rails.** → **Big single page + derive client-side.** Backend has
   no featured/on-offer/sold filter; adding them was out of scope. `new-arrivals` + `budget`
   get true infinite scroll; the derived three fetch `limit=100` and derive.

## 4. Plan

**New shared pieces**
- `frontend/lib/useInfiniteList.ts` — the hook: `items[]`, `page`, `hasMore`, `loading`,
  `error`; `loadMore()` appends (de-duped by a `getId`), `reset()` re-seeds page 1.
  Plain `fetch` + `useState` + `useCallback`, no data library.
- `frontend/components/LoadMore.tsx` — one trigger: IntersectionObserver sentinel **+**
  always-rendered "Load more" button + `aria-live` count. `auto={false}` on admin tables
  (button only). Respects reduced-motion and a missing IntersectionObserver.

**API layer (`frontend/lib/api.ts`)**
- `getProducts(params, { page?, limit? })` → now returns `{ products, categories, pagination }`
  and forwards `sort`.
- `apiFetchPage<T>(path)` → `{ data, pagination }` for the cookie-scoped lists.
- `getOrdersPage(page)`, and page-aware admin builders (`&page=&limit=`).
- Inline `notes.list` gets `limit=100` (show all notes for one entity); the admin notes
  page uses a new `notes.listPage`.

**Backend (the one allowed change)**
- `GET /api/products` rewritten as an aggregation: `$min` variant price → `fromPrice`,
  `$lookup` non-cancelled orders → `soldCount`, `$sort` by the chosen key with an `_id`
  tiebreaker (stable paging → no dupes/skips), then `$skip`/`$limit`.
- `productQuery.ts` gains a lenient `sort` enum + `productSortSpec()`.

**Screens** (in order, each verified before the next)
- Shop: server component fetches page 1 (SSR) → hydrates client `ProductGrid` seeded with
  it; keyed by the filter+sort querystring so a filter change remounts with a fresh seed.
- Collections: `new-arrivals`/`budget` reuse `ProductGrid` (infinite); the derived three
  stay server-rendered from a `limit=100` fetch.
- Account: client list over `/api/orders`.
- Admin products/orders/payments/notes: the hook + "Load more" button (`auto={false}`);
  each keeps its filters and resets to page 1 on filter change.

**Rejected alternatives**
- Option B (client sort, limit=100) — silent 100-cap on price/popular; owner wanted correct.
- Backend filters for featured/offer/popular — extra scope beyond the one sort param.
- `$lookup` vs a second JS pass for `soldCount` — `$lookup` keeps paging in the DB (one
  query, one code path) and stamps `soldCount` for the response for free.

**Deliberately NOT changing:** dashboard aggregates, single-doc reads, cart, checkout,
the design system / markup. Homepage `loadHomeData` gets a one-line `limit=100` bump only
to stop it deriving its rails from just the first 24 products (a live regression from the
backend paging ship).

## 5. Tasks

- [x] Backend: `sort` param + aggregation + unit test for `productSortSpec`.
- [x] `PageMeta` type + `api.ts` (getProducts/apiFetchPage/getOrdersPage/admin builders).
- [x] `useInfiniteList` hook.
- [x] `LoadMore` component + CSS.
- [x] Shop grid (SSR page 1 → client list).
- [x] Collections (infinite + derived).
- [x] Account order history.
- [x] Admin products / orders / payments / notes.
- [x] `loadHomeData` limit bump.
- [x] Typecheck (backend + frontend); confirm shop still SSRs.

## 6. Updates

- **2026-10-19** — Spec created; both decisions locked; implementation started.
- **2026-10-19** — Shipped all 7 screens + the backend sort. Typecheck (backend +
  frontend) green; backend unit suites 18/18 (productQuery incl. new sort tests,
  pagination, popularity). Live DB + browser scroll not run here (needs Atlas + a
  running app) — same bar as backend build-step-3.

## 7. Explanation

### 1. What changed
- The storefront + admin now **page through long lists as infinite scroll** instead
  of silently showing only the backend's first page.
- `GET /api/products` gained a server-side `sort` (newest / price-asc / price-desc /
  popular) that orders the **whole** catalogue before paging.
- Two reusable client pieces do the paging everywhere: a `useInfiniteList` hook and a
  `LoadMore` trigger (scroll sentinel + button).

### 2. Why it was needed
The backend started returning one page at a time, but the frontend wasn't wired for it
— so a shop/admin list quietly capped at the first page, and the shop's price/popular
sorts only reordered that one loaded page (wrong once there's more than a page).

### 3. How it works, step by step
1. A **server component** (shop, collections new-arrivals/budget) fetches **page 1**
   so the first screen is real server-rendered HTML (SEO-safe), then hands that page as
   a *seed* to a client grid.
2. `useInfiniteList(fetchPage, { getId, initialData, initialPagination })` holds the
   accumulated `items`, the current `pagination`, `loading`, and `error`. `loadMore()`
   fetches the **next** page and appends it; items are **de-duped by id** so an
   overlapping page never shows a row twice. `reset()` reloads page 1.
3. `LoadMore` renders an `IntersectionObserver` **sentinel** (an invisible marker; when
   it nears the viewport, `loadMore()` fires) **plus** an always-visible "Load more"
   button. The button is the fallback for keyboard users, reduced-motion, a browser with
   no observer, and admin tables (`auto={false}` → button only). A `aria-live` line
   announces "Showing X of Y" after each append. On a failed load the button becomes
   "Retry" and the already-loaded items stay on screen.
4. **Filters reset to page 1.** Shop/collections: the server re-renders page 1 and the
   grid is keyed by the filter+sort querystring, so it **remounts** with a fresh seed.
   Admin: a filter change re-creates `fetchPage`, which re-creates `reset`, and a small
   debounced effect calls it.
5. **Server-side sort (the DB part).** `GET /api/products` runs an aggregation:
   `$addFields fromPrice = $min(variants.price)`; a `$lookup` into non-cancelled orders
   sums each product's `soldCount`; `$sort` by the chosen key with a final `_id`
   **tiebreaker** (so equal keys can't reorder between page requests and drop/duplicate a
   product); then `$skip`/`$limit`. `fromPrice` and `soldCount` aren't stored fields —
   the aggregation derives them — which is why a plain `sort` param wasn't enough.

### 4. Files / functions changed
**Backend**
- `src/lib/productQuery.ts` — added a lenient `sort` enum to the schema (garbage →
  `newest`, never 400) and `productSortSpec()` (sort → Mongo sort with `_id` tiebreaker).
- `src/routes/products.ts` — rewrote the catalogue read as the aggregation above;
  dropped the old `.find().sort()` + separate orders aggregation + `attachSoldCount`.
- `tests/productQuery.test.ts` — added the `sort` default/fallback + `productSortSpec`
  mapping tests.

**Frontend**
- `lib/types.ts` — `PageMeta` (mirrors the backend `pagination` block).
- `lib/api.ts` — `getProducts(params, { page, limit })` now returns `pagination` and
  forwards `sort`; new `apiFetchPage<T>` (keeps `data` + `pagination`); `getOrdersPage`;
  admin `orders` / `payments.list` / `products.list` / new `notes.listPage` take a page.
  Inline `notes.list` now asks for `limit=100` (so one entity's whole thread shows).
- `lib/useInfiniteList.ts` — NEW hook.
- `components/LoadMore.tsx` — NEW trigger. `app/globals.css` — `.load-more*` styles.
- `app/(shop)/components/ProductGrid.tsx` — NEW client grid (seeded, appends).
- `app/(shop)/shop/page.tsx` — SSR page 1 → hydrate `ProductGrid`; keyed by filters.
- `app/(shop)/collections/[slug]/page.tsx` + `lib/catalogue.ts` — new-arrivals/budget
  reuse `ProductGrid` (infinite); staff-picks/offers/popular derive from a `limit=100`
  page, server-rendered. `loadHomeData` bumped to `limit=100`.
- `app/(shop)/account/page.tsx` — order history via the hook + `LoadMore`.
- `app/admin/{products,orders,payments,notes}/page.tsx` — the hook + "Load more" button;
  delete/add use the hook's `setItems`/`reset`.

### 5. Important decisions
- **Server-side sort (option A)** over a client cap — correct at any scale; cost was an
  aggregation (`fromPrice`/`soldCount` aren't stored), accepted as the one backend change.
- **`$lookup` for `soldCount`** over a second JS pass — keeps paging in the DB (one query,
  one code path) and stamps `soldCount` on the response for free.
- **`_id` tiebreaker** on every sort — the thing that makes offset paging stable (no
  dupes/skips). Not optional.
- **Collections derived rails = big single page** — the backend can't filter
  featured/on-offer/sold; adding those was out of scope.
- **`loadHomeData` limit bump** — not in the original scope, but the backend paging had
  silently cut the homepage rails to the first 24 products; one line fixes it.
- **Admin tables = button, not auto-scroll** — dense tables + auto-advance are fiddly.

### 6. Tests / verification (real output)
- Backend `tsc --noEmit` → clean. Frontend `tsc --noEmit` → clean.
- Backend unit suites `productQuery` + `pagination` + `popularity` → **18 / 18 pass**
  (includes the two new sort tests).
- **Not run here:** live DB paging/sort and in-browser scroll — need Atlas + a running
  app. The aggregation is standard `$lookup`/`$min`/`$sort`/`$skip`/`$limit`; sort keys
  are unit-covered.

### 7. Edge cases and limitations
- **Derived collections + homepage cap at 100 source products** (the API max page). Fine
  at this shop's scale; needs dedicated rail endpoints past that.
- **`popular` sort does a `$lookup` per matched product** (O(products × order-items)) —
  cheap now; the upgrade path (denormalise `soldCount`, `$inc` on delivery) is a
  `ponytail:` note in the route.
- **Deep offset pages get slower** (inherited from the backend's `skip` paging) — a
  non-issue at this volume.
- **A failed `loadMore` keeps the loaded items** and shows Retry; it never blanks the list.
