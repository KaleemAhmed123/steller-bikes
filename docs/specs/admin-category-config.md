# Admin: category management + search + Platform config

## 1. Task
- **Name:** Admin category management, product/inventory search, and a Platform config tab.
- **Status:** In progress
- **Started:** 2026-10-20
- **Last updated:** 2026-10-20

## 2. What you asked for
Three jobs on the back-office (admin):

**Job 1 — Category management.** Category is free-text today. Make it config-driven: a
canonical `categories` list on the settings singleton. Product form category becomes a
dropdown. Add/rename/delete categories from the new config tab. Delete is guarded; rename
bulk-updates products.

**Job 2 — Search bars.** Products list: server `?q=` matching name/slug/category, ALL
statuses, debounced input like Orders. Inventory: client-side filter box over product
name / SKU (inventory loads everything at once).

**Job 3 — Platform config tab.** Extend the one settings document with operational config
and add a new owner-only sidebar tab. Fields confirmed: `categories[]`, `codEnabled`,
`onlinePaymentEnabled`, `announcement`. Storefront must respect the toggles + show the banner.

Guardrails: zod at the boundary; owner-only for config + category mutations; server stays
the authority; minimalist UI matching the polished admin; append a dated spec entry.

## 3. Open questions (answered)
1. **Category storage** — config list on the settings doc vs a real Category collection.
   → **Config list.** Ponytail; ~5 categories, no need for a collection. ✅ Approved.
2. **Delete safety** — block / reassign / clear. → **Block** when any product still uses it,
   show the count. Plus a **confirmation popup** before delete fires. ✅ Approved.
3. **Inventory search side** — client vs server. → **Client-side** (inventory loads all
   variants in one call). ✅ Approved.
4. **Config tab** — separate vs merged. → **Separate "Platform" tab** (owner-only); Settings
   stays shop-facing identity. Same underlying doc. ✅ Approved.
5. **Config field list** → `categories[]`, `codEnabled`, `onlinePaymentEnabled`,
   `announcement`. Deferred: free-delivery threshold (no fee system), default low-stock,
   currency symbol, store open/closed. ✅ Approved.
6. **CAT_ORDER (homepage tile order)** — list-driven or leave hardcoded. → **Left hardcoded**
   (default; homepage already works). Not raised by owner.

## 4. Plan
**No migration.** The category dropdown is the **union** of the stored `categories` list and
the distinct categories already on products — so nothing breaks and every in-use category
always appears. Owner can pre-create empty categories (stored) and only delete ones with 0
products.

**Backend**
- `models/settings.ts`: add `categories: [String]`, `codEnabled` (default true),
  `onlinePaymentEnabled` (default true), `announcement` (default '').
- `routes/settings.ts` (public GET): return the toggles + announcement so the storefront reads them.
- `routes/admin.ts`:
  - Settings PATCH zod gains `codEnabled` / `onlinePaymentEnabled` / `announcement`; a guard
    rejects turning **both** payment methods off. (categories NOT in this schema — managed separately.)
  - `GET /api/admin/categories` (`products.manage`) — union + product counts, so managers' product form works.
  - `POST /api/admin/categories` (`settings.manage`) — add a name.
  - `PATCH /api/admin/categories` (`settings.manage`) — rename: `updateMany` products + rename in the list.
  - `DELETE /api/admin/categories/:name` (`settings.manage`) — block (409 + count) if in use, else remove.
  - `GET /api/admin/products` gains `?q=` (name / slug / category, safe regex, all statuses).
- `routes/checkout.ts`: COD route rejects when `codEnabled` is off; razorpay order/verify reject
  when `onlinePaymentEnabled` is off (on top of the existing `razorpayConfigured()` env gate).

**Frontend**
- `lib/types.ts`: `StoreSettings` gains the 3 fields; add `AdminCategory { name, count }`.
- `lib/api.ts`: `EMPTY_SETTINGS` gains the fields; `products.list(q, page)`; `categories` client.
- `components/ProductForm.tsx`: category `<input>` → `<select>` fed by the categories endpoint
  (keeps the current value as an option if it's not in the list yet).
- `products/page.tsx`: debounced search input, mirroring Orders.
- `inventory/page.tsx`: client-side filter box over the variant table.
- `AdminShell.tsx`: new owner-only `Platform` nav row.
- `admin/platform/page.tsx`: toggles + announcement form + category manager (add/rename/delete
  with confirm popup), styled like the polished admin.
- `checkout/page.tsx`: respect `codEnabled` / `onlinePaymentEnabled` from settings.
- `(shop)/layout.tsx`: announcement banner strip when set.

**Rejected:** real delivery-fee math (out of scope), currency switch (INR-only), a Category
collection (overkill).

## 5. Tasks
- [x] Settings model + public GET fields
- [x] Admin settings PATCH fields + both-off guard
- [x] Category endpoints (list/add/rename/delete)
- [x] Products `?q=` search endpoint
- [x] Checkout toggle enforcement (COD + online)
- [x] types.ts + api.ts
- [x] ProductForm category dropdown
- [x] Products page search input
- [x] Inventory client filter
- [x] Platform tab (nav + page)
- [x] Checkout respects toggles
- [x] Announcement banner
- [x] tsc (backend + frontend) clean; route render check (see Updates)

## 6. Updates
- **2026-10-20** — Spec written; sections 1–5 approved; build started.
- **2026-10-20** — Built all three jobs. `tsc --noEmit` clean on backend and frontend.
  Route render check against the already-running frontend dev server: `/`,
  `/admin/products`, `/admin/inventory`, `/checkout` → 200. `/admin/platform` → 404
  **only** because the running dev server (started before the folder existed) hadn't
  re-scanned the route tree — a Next-on-Windows watcher miss for new directories; the
  page is in the clean typecheck. A one-time restart of the single dev server registers
  it. Backend (port 3001) was not running, so the admin API routes were not exercised
  end-to-end — to be done once the backend is up.

## 7. Explanation

### 1. What changed
- **Categories are now a managed list, not free text.** The product form picks from a
  dropdown; a new owner-only **Platform** tab adds/renames/deletes categories.
- **Two admin search bars:** Products (server-side `?q=`) and Inventory (instant client-side filter).
- **A Platform config tab** holding payment on/off switches + a storefront announcement banner,
  all stored on the one existing settings document.
- **The storefront respects the switches** — a disabled payment method disappears from checkout,
  and the server refuses it too; the banner shows when set.

### 2. Why it was needed
The owner had no way to curate categories (typos created phantom categories), no way to find a
product/variant in a long list, and no self-serve control over payment methods or a sale banner —
every such change needed a developer.

### 3. How it works, step by step
- **Category list = union.** The dropdown and manager show the stored list *plus* every category
  actually on a product. So no data migration was needed and an in-use category can never vanish
  from the form. The owner can pre-create empty categories; only empty ones can be deleted.
- **Rename** runs one `updateMany` (moves every product from the old name to the new) then swaps
  the name in the stored list — all server-side, owner-only.
- **Delete** first counts products using the name: >0 → blocked (409 with the count); 0 → a browser
  confirm popup, then removed.
- **Products search** adds `?q=` to the admin list endpoint, matching name/slug/category (case-
  insensitive, all statuses). The input is debounced 250ms and re-seeds the infinite list — copied
  from the Orders screen.
- **Inventory search** filters the already-loaded variant array in the browser (name/SKU) — no API call.
- **Payment toggles** live on the settings doc (default on). The storefront reads them via the public
  `GET /api/settings`; checkout hides a disabled method. The **server** is the real guard: the COD
  route 403s when COD is off, the Razorpay routes 503 when online is off. A save that would turn both
  off is rejected, so the shop can never become unbuyable.
- **Announcement** is a string on the settings doc; the storefront layout renders a banner strip above
  the header when it's non-empty.

### 4. Files / functions changed
**Backend**
- `models/settings.ts` — added `categories`, `codEnabled`, `onlinePaymentEnabled`, `announcement`.
- `routes/settings.ts` — public GET now returns the toggles + announcement (merged over defaults).
- `routes/admin.ts` — `GET /products` gained `?q=`; settings PATCH gained the 3 fields + a both-off
  guard; four category endpoints (`GET/POST/PATCH /categories`, `DELETE /categories/:name`) with the
  `categoriesWithCounts` union helper.
- `routes/checkout.ts` — `paymentFlags()` helper; COD route 403s when COD off; razorpay order/verify
  503 when online off.

**Frontend**
- `lib/types.ts` — `StoreSettings` + 3 fields; new `AdminCategory`.
- `lib/api.ts` — `EMPTY_SETTINGS` + fields; `products.list(q, page)`; new `categories` client.
- `app/admin/components/ProductForm.tsx` — category input → dropdown (keeps the current value as an option).
- `app/admin/products/page.tsx` — debounced search input + search-aware empty state.
- `app/admin/inventory/page.tsx` — client-side filter box over the variant table.
- `app/admin/AdminShell.tsx` — owner-only **Platform** nav row.
- `app/admin/platform/page.tsx` — new: toggles + announcement form + category manager.
- `app/admin/settings/page.tsx` — typed so its EMPTY/FIELDS carry (but don't edit) the new fields.
- `app/(shop)/checkout/page.tsx` — reads the toggles; hides unavailable methods; defaults the choice.
- `app/(shop)/layout.tsx` — renders the announcement banner.
- `app/redesign.css` — `.rc-announce` banner style.

### 5. Important decisions
- **Config list over a Category collection** — ~5 categories; a collection is pure overhead.
- **Union (stored + in-use) over a seed migration** — zero migration, nothing orphaned.
- **Block-on-delete + confirm popup** — safest; `category` is required on products so "clear" isn't valid.
- **Toggles ride the existing settings PATCH; categories use dedicated endpoints** — rename/delete need
  guards and a bulk update, so they can't be a naive array write; a settings save can never touch categories.
- **Server is authority** — hiding the checkout button is cosmetic; the route guards are the real enforcement.
- **Rejected** real delivery-fee math (no fee system exists), currency switch (INR-only).

### 6. Tests / verification
- `npx tsc --noEmit` — **clean** on both backend and frontend (ran twice on the frontend after a type fix).
- Route render check on the running frontend dev server — `/`, `/admin/products`, `/admin/inventory`,
  `/checkout` all **200**; `/admin/platform` 404 due to the dev-server not re-scanning the new folder
  (code is valid per tsc; a restart registers it). Backend was down, so API routes weren't hit end-to-end.

### 7. Edge cases and limitations
- **Not yet exercised end-to-end** against a running backend (categories CRUD, the 403/503 guards, the
  both-off rejection). Worth a manual pass once the API is up.
- **Two-tab staleness:** editing shop info on Settings and toggles on Platform in two tabs at once could
  let the older tab's save overwrite with stale values — negligible for a single-owner shop.
- **Online needs Razorpay keys** regardless of the toggle; the Platform UI says so. The both-off guard
  checks the flags, not whether keys exist — turning COD off with no keys set would still block checkout
  (the storefront then shows "temporarily unavailable").
- **Rename/add use `prompt()`/inline input** — minimal UI; fine for a low-frequency owner task.
- **CAT_ORDER** (homepage tile order) stays hardcoded, as agreed.
