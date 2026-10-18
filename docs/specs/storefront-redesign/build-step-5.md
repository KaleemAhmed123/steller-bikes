# Build step 5 — Admin config: product CRUD + store settings

**Date:** 2026-10-18 · **Status:** built (typecheck + tests + live E2E green; `next build` pending a dev stop)

Gives the owner an admin UI to manage everything the new storefront reads: full product
management (create / edit / delete, variants, featured, images, status) and the store-settings
document. Finishes the admin-side items deferred in [`build-step-4.md`](build-step-4.md).

---

## 1. Task

Add admin screens + the backend to back them, so the owner configures the catalogue and shop
details without touching code or the seed.

- **Name:** Admin config — product CRUD + store settings
- **Status:** in progress · **Started:** 2026-10-18 · **Last updated:** 2026-10-18

## 2. What you asked for

> "add these sections in admin and finish the backend work … adjust according to the new frontend …
> so those all config in easy way."

Answered forks:
1. **Product scope → Full CRUD** (create, edit, delete products; add/edit/remove variants).
2. **Images → Upload from computer.**
3. **Wishlist → skip** (localStorage stays; revisit later).

## 3. Open questions (answered) + settled decisions

- **Image storage: Cloudinary, browser-direct unsigned upload.** The admin uploads the file
  straight to Cloudinary (a free image host/CDN) using an *unsigned upload preset* (a public
  setting, safe to expose). Cloudinary returns a URL we store on the product. **Why this way:** no
  file passes through our server (no `multer`, no server secret, no new backend dependency), and
  Render/Vercel wiping their disks doesn't matter. **Paste-a-URL always works too**, so the admin
  is usable *before* Cloudinary is set up. `ponytail:` unsigned preset is open to anyone who has it
  — fine for an admin tool; tighten with a signed upload + a size/type cap if abused.
- **Delete = hard delete, guarded by a confirm.** Order history is safe because order items are
  snapshotted (name/price copied at purchase). To hide a product *without* deleting, set its
  **status** to `archived` (already in the schema).
- **Permissions:** new `products.manage` (owner + manager) and `settings.manage` (owner only —
  shop identity is an owner concern).
- **Prices:** the form takes rupees; the frontend converts to paise before sending; the server
  re-validates as non-negative integers. Server stays authoritative.

## 4. Plan

### Backend
- `lib/permissions.ts` → add `products.manage`, `settings.manage`; grant per the decision.
- `lib/productInput.ts` (new, pure + testable) → Zod schema for a product create/update payload
  (slug, name, category, description, image, images[], featured, status, specs, variants[min 1]).
- `routes/admin.ts` → `GET/POST /products`, `GET/PATCH/DELETE /products/:id` (products.manage);
  `GET/PATCH /settings` (settings.manage). Duplicate-slug → 409.
- `models/settings.ts` → unchanged; admin PATCH upserts the single doc.
- `tests/productInput.test.ts` → schema accepts a good payload, rejects empty variants / bad price /
  missing slug.

### Frontend
- `lib/api.ts` → `adminApi.products.{list,create,update,remove}`, `adminApi.settings.{get,update}`;
  a `uploadImage(file)` helper (Cloudinary, or throws a clear "not configured" error).
- `lib/types.ts` → `ProductInput`, `VariantInput`, reuse `Product`/`StoreSettings`.
- `app/admin/products/page.tsx` → list (name, category, status, featured, #variants) + New + Edit +
  Delete.
- `app/admin/products/new/page.tsx` + `app/admin/products/[id]/page.tsx` → both render a shared
  `ProductForm`.
- `app/admin/components/ProductForm.tsx` → all fields + variant rows + spec rows + an image control
  (main photo + gallery) with upload/paste.
- `app/admin/settings/page.tsx` → settings form.
- `app/admin/AdminShell.tsx` → nav gains "Products" and "Settings".
- `app/globals.css` → a small block for the product form / variant rows / image chips.

### Env (owner sets, optional)
- Frontend `.env.local`: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
  Without them, image fields accept a pasted URL/path and the Upload button is hidden.

### Rejected / deferred
- Server-side upload via `multer` + Cloudinary SDK — more code + a server secret for no gain over
  browser-direct unsigned upload.
- Soft-delete/trash — `status: 'archived'` already covers "hide without deleting".
- Wishlist sync — not this pass.

## 5. Tasks

- [x] Perms: `products.manage` (owner+manager) + `settings.manage` (owner)
- [x] `lib/productInput.ts` + test (6 checks)
- [x] Admin routes: product CRUD (list/get/create/patch/delete) + settings get/patch
- [x] `adminApi.products` + `adminApi.settings` + `uploadImage`/`uploadConfigured` + types
- [x] `ProductForm` + products list/new/edit pages
- [x] Settings page + nav (Settings owner-only) + CSS
- [x] Typecheck BE+FE clean; backend tests 37/37; **live authenticated CRUD E2E green**
- [ ] `next build` — SKIPPED: `next dev` live on :3000 (would corrupt dev chunks). Run after a dev stop.
- [x] Section-7 walkthrough + README/playbook updated + commit commands printed

## 6. Updates

- **2026-10-18** — Plan written; forks answered (full CRUD, upload-from-computer via Cloudinary
  browser-direct, skip wishlist). Building.
- **2026-10-18** — Built. Backend typecheck clean; `npm test` 37/37 (6 new productInput + 1 new
  permissions). Live smoke on the running API: `GET /api/settings` 200, products carry
  `soldCount/images/featured`, `/api/admin/products` gated 401. Live **authenticated** cycle:
  login → create → patch featured → **duplicate slug 409** → delete, all correct (test product
  removed). `next build` not run — dev was live on :3000.

## 7. Explanation

### 1. What changed
The admin gained two new sections: **Products** (full create / edit / delete, including variants,
featured, photos, status) and **Settings** (the shop details the storefront shows). The backend
gained the routes, permissions, and validation to back them, plus an image-upload path.

### 2. Why it was needed
After step 4 the storefront *read* real fields, but the only way to *set* them was the seed script
or editing the database by hand. The owner needs to run the catalogue and shop details from the
admin — add a bike, mark it featured, upload photos, fix a price, fill the address — without code.

### 3. How it works, step by step
- **Who can do what (RBAC):** two new permissions. `products.manage` (owner + manager) gates all
  product routes; `settings.manage` (owner only) gates settings. The Settings nav link only shows
  for an owner, and the server re-checks the permission on every call.
- **Validation:** `lib/productInput.ts` is a Zod schema (Zod = a library that checks a payload's
  shape). It enforces a hyphenated lowercase slug, at least one variant, non-negative integer
  prices/stock in paise, and a valid status. The route rejects anything else with a clear message.
- **Create / edit:** `ProductForm` (one client component for both) collects every field — content,
  featured, main photo, gallery photos, variant rows (price/was in ₹), spec rows. On submit it
  converts ₹→paise and calls `POST` (create) or `PATCH` (edit). A duplicate slug comes back as
  Mongo error 11000, which the route turns into a friendly 409.
- **Delete:** a confirm, then `DELETE`. Order history is unaffected because order items are
  snapshotted at purchase. To hide a product instead, set status to `archived`.
- **Photos:** each photo field is a URL/path box plus (when Cloudinary is configured) an Upload
  button. Upload goes **straight from the browser to Cloudinary** with an unsigned preset; Cloudinary
  returns a hosted URL that gets saved on the product. Our server never touches the file. With no
  Cloudinary keys, the Upload button is hidden and pasting a path still works.
- **Settings:** the Settings page loads the current doc, shows a form, and `PATCH`es it; the server
  upserts the single settings document. The public `GET /api/settings` (built in step 4) then feeds
  the storefront showroom.

### 4. Files / functions changed
**Backend**
- `lib/permissions.ts` — added `products.manage` + `settings.manage` and granted them.
- `lib/productInput.ts` (new) — `productInputSchema` + `productUpdateSchema`.
- `routes/admin.ts` — product CRUD routes + settings GET/PATCH; `isDuplicate` → 409.
- `tests/productInput.test.ts` (new, 6) + `tests/permissions.test.ts` (one new case).

**Frontend**
- `lib/types.ts` — `ProductInput`, `VariantInput`.
- `lib/api.ts` — `adminApi.products.*`, `adminApi.settings.*`, `uploadImage`, `uploadConfigured`.
- `app/admin/components/ProductForm.tsx` (new) — the shared create/edit form + `ImageField`.
- `app/admin/products/page.tsx` (new) — list + delete.
- `app/admin/products/new/page.tsx` + `app/admin/products/[id]/page.tsx` (new) — create / edit.
- `app/admin/settings/page.tsx` (new) — settings form.
- `app/admin/AdminShell.tsx` — nav + owner-only Settings link.
- `app/globals.css` — product-editor / settings-form styles + `.btn-secondary`, `.field`.

### 5. Important decisions
- **Cloudinary browser-direct unsigned upload** — no `multer`, no server secret, no new backend
  dependency, survives Render/Vercel disk wipes; paste-a-URL always works so the admin is usable
  before setup. Ceiling noted in the code comment.
- **Hard delete + `archived` status** — no soft-delete layer; the status already covers "hide".
- **One `ProductForm` for create and edit** — same fields, fewer files.
- **Server re-validates everything** — the form is a convenience; the Zod schema at the boundary is
  the authority (prices as paise ints, slug format, ≥1 variant).

### 6. Tests / verification (actually run)
- Backend `tsc --noEmit`: clean. `npm test`: **37/37** (6 new productInput, 1 new permissions).
- Frontend `tsc --noEmit`: clean.
- Live API smoke: `/api/settings` 200; products carry `soldCount/images/featured`;
  `/api/admin/products` returns 401 without a session.
- Live **authenticated** E2E against the running server: login → create product → PATCH
  `featured:true` (verified true) → duplicate slug → **409** → delete → **200**. Test product removed.
- `next build`: **not run** — `next dev` live on :3000.

### 7. Edge cases and limitations
- **Upload needs Cloudinary env** (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `_UPLOAD_PRESET`); until
  set, photos are added by pasting a URL/path.
- **Unsigned preset** is usable by anyone who has it — acceptable for an admin tool; add a signed
  upload + size/type cap if abused.
- **Delete is permanent** (order history is safe via snapshots); use `archived` to hide.
- **No variant-level stock edit here** — stock still lives on the Inventory screen (its movement log
  is the audit trail); this form sets a variant's *initial* stock on create/edit.
- **No admin UI around the public `/api/settings`** rate/caching — fine at this scale.
- **`next build` unverified** this session (dev running).
