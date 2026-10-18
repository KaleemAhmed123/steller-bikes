# Build Step 2 — Catalogue (detail page + filters) + Next.js frontend

**Status:** Shipped (code level) · **Started:** 2026-10-16 · **Last updated:** 2026-10-16

> Second code step after the thin spine. Two things happened together: the planned
> **catalogue** work (product detail page + category/search/price filters), and a **stack change**
> the owner asked for mid-step — the frontend moved from React+Vite to **Next.js**.

## 1. Task

Build the storefront catalogue:
- a **product detail page** (one cycle, SSR'd for SEO),
- **filters** on the shop page: category, text search, price range.

And migrate the frontend to **Next.js (App Router)** per the owner's decision.

## 2. What you asked for

- "Let us use Next.js instead so we get routing and SSR out of the box."
- Clarified: **Next.js is the frontend only.** Do **not** use Next.js API routes / use it as a
  backend. The **Express app stays the backend** ("for better control on frontend we will have our
  backend app").
- Routing style: **App Router**.
- Hosting: **frontend on Vercel, backend on Render.**
- Keep working in the plain teaching style; ponytail; update docs in the same change.

## 3. Open questions — answered 2026-10-16

| # | Question | Answer |
|---|----------|--------|
| A | Next.js as backend too, or frontend only? | **Frontend only.** Express stays the API. |
| B | App Router or Pages Router? | **App Router.** |
| C | Where does API logic live? | **Express** (separate backend). |
| D | Hosting? | **Vercel (frontend) + Render (backend).** |

Defaults taken without asking (idiomatic App Router, named in the plan):
- Filters live in the **URL** (`/?category=City&q=trail`) and drive server-side rendering →
  shareable, bookmarkable, SEO-friendly. Search/price debounced ~300ms.
- One public env var `NEXT_PUBLIC_API_URL` for both server-render and browser fetches.
- Detail URL = `/p/:slug`. Search covers **name + description**.
- Prices filtered in **paise** on the API; the UI takes rupees and converts (×100).

## 4. Plan

**New architecture (two origins):**

```
                 Vercel                          Render
Browser ──▶ Next.js frontend ──(SSR fetch)──▶ Express API ──▶ MongoDB Atlas
   │         (renders HTML)                   (authority on price/stock)
   └──────────(browser fetch: filters, later cart)─────────────▲
                         needs CORS ──────────────────────────┘
```

- Next's **server** fetches product pages from Express (server-to-server, no CORS) → SSR HTML.
- The browser's **interactive** calls (filter changes, later cart) hit Express directly → **CORS**.
- Next **never** touches MongoDB or computes a price. Express stays the single authority.

**Backend (Express) — small additions:**
- `GET /api/products` gains filters `?category=&q=&minPrice=&maxPrice=` (Zod-validated) and now
  also returns `categories` (distinct over all published products).
- New `GET /api/products/:slug` → one published product, 404 if missing.
- Add `cors`, allowing the frontend origin (env `FRONTEND_ORIGIN`), `credentials:true` for the
  later login cookie.

**Frontend — rebuilt as Next.js App Router** (Vite files deleted):
- `app/layout.tsx` — shared header/nav + theme.
- `app/page.tsx` — shop; server component reading filter params, SSR-fetching the list.
- `app/p/[slug]/page.tsx` — detail; server component, with `generateMetadata` for per-product SEO.
- `app/components/FilterBar.tsx` — `'use client'`; writes filters into the URL (debounced).
- `app/components/ProductCard.tsx` — links to the detail page.
- `lib/api.ts` (fetch helpers + `money()`), `lib/types.ts`.

**Rejected alternatives:**
- *Next.js API routes / server actions for the API* — owner wants Express as the backend; rejected.
- *Client-side filtering* — breaks once the catalogue paginates; server-side via Express is correct
  and the authority already lives there.
- *react-router on the old Vite app* — moot once we moved to Next.js (routing built in).

## 5. Tasks

- [x] Backend: Zod filter schema + `buildProductFilter` helper (`lib/productQuery.ts`).
- [x] Backend: filters + `categories` on `GET /api/products`.
- [x] Backend: `GET /api/products/:slug` (404 on miss).
- [x] Backend: `cors` + `FRONTEND_ORIGIN` env.
- [x] Backend: `node:test` for the filter builder (7 cases).
- [x] Frontend: delete Vite files; scaffold Next.js App Router.
- [x] Frontend: layout, shop page (filters), detail page, FilterBar, ProductCard, api/types.
- [x] Frontend: port the charcoal+lime theme + new filter/detail CSS.
- [x] Docs: update decisions (D2/D4 override), overview architecture, scaffold, playbook, README.
- [x] Verify: backend typecheck + test; frontend typecheck + build. *(live DB run still owner's.)*

## 6. Updates

- **2026-10-16** — Step 2 planned on the original Vite stack (detail page + filters, server-side).
- **2026-10-16** — Owner switched the frontend to **Next.js (App Router), frontend-only**; Express
  stays the backend; hosting Vercel + Render. Re-planned on two origins (CORS added). Diagnosed the
  failed live run as a bad `VITE_API_URL` value (missing scheme + wrong port), now obsolete.
- **2026-10-16** — Built & verified at code level: backend typecheck + 7 tests pass; frontend
  typecheck + build pass. Live DB round-trip still pending the owner's Atlas run.

## 7. Explanation (plain-English walkthrough)

### What changed
- The **frontend is now a Next.js app** (App Router) instead of a React+Vite single page. It has a
  real **shop page** with **filters** and a **product detail page**, both server-rendered.
- The **Express backend** gained **catalogue filtering**, a **single-product endpoint**, and
  **CORS** so the separately-hosted frontend can call it.

### Why it was needed
- A store needs Google to find its product pages — **SSR** (server-side rendering: the server sends
  finished HTML) gives that. Next.js does SSR + routing out of the box, which is why the owner chose
  it. Customers also need to filter a growing catalogue and open a page per cycle.

### How it works, step by step
1. You open the shop. Next's **server** calls `GET /api/products` on Express, which queries MongoDB
   for published products + the category list, and returns finished HTML to the browser.
2. You click a category / type a search / set a price. The **FilterBar** (browser code) writes those
   into the page URL (e.g. `/?category=City&q=trail`). The server re-renders with the new filters.
   Because it's in the URL, the result is shareable and bookmarkable.
3. Express validates the filters with **Zod** (checks values at the edge), builds a MongoDB query
   (category = exact; search = case-insensitive match on name/description; price = a variant in
   range via `$elemMatch`), and returns the matches.
4. You click a cycle. Next's server calls `GET /api/products/:slug`, gets that one product, and
   renders the **detail page** (photo, options with price + live stock label, specs table). A
   per-product title/description is set for SEO.

### Files / functions changed
- **backend/src/lib/productQuery.ts** (new) — `productQuerySchema` (Zod) + `buildProductFilter`
  (safe MongoDB query; escapes search regex; `$elemMatch` for price).
- **backend/src/routes/products.ts** — list route now validates + filters + returns `categories`;
  new `:slug` detail route.
- **backend/src/index.ts** — `cors({ origin: FRONTEND_ORIGIN, credentials: true })`.
- **backend/src/config.ts / .env.example** — new `FRONTEND_ORIGIN` env.
- **backend/tests/productQuery.test.ts** (new) — 7 checks on the filter builder.
- **frontend/** — Vite files removed; Next.js app added: `app/layout.tsx`, `app/page.tsx`,
  `app/p/[slug]/page.tsx`, `app/components/{FilterBar,ProductCard}.tsx`, `lib/{api,types}.ts`,
  `app/globals.css`, `next.config.ts`, new `tsconfig.json`, `.env.example`.

### Important decisions
- **Next.js = frontend only** (owner's rule). Express remains the price/stock authority.
- **Filters in the URL** drive SSR → SEO + shareable + less client code than React state.
- **CORS** is the one new cost of splitting across two hosts; handled with the standard `cors`
  package scoped to the frontend origin.
- **`cache: 'no-store'`** on fetches so stock/price are always fresh.

### Tests / verification
- Backend: `npm run typecheck` clean; `npm test` → **7/7 pass**.
- Frontend: `npm run typecheck` + `npm run build` — see the Updates log for the run.
- **Not verified:** the live database round-trip (needs the owner's Atlas `MONGODB_URI`).

### Edge cases and limitations
- No "add to cart" yet — deferred to step 3 (cart). The detail page says "coming soon".
- Sample product images may be placeholders until real photos are added.
- `FRONTEND_ORIGIN` allows a single origin; add more (or a list) if we run multiple frontends.
- Price filter matches a product if **any** variant is in range (expected for a "from ₹X" catalogue).
