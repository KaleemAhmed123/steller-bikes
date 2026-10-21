# App icons + white header

## 1. Task

- **Name:** Storefront white header + tasteful line icons across admin & storefront
- **Status:** in progress
- **Started:** 2026-10-20
- **Last updated:** 2026-10-20

## 2. What you asked for

Two polish jobs, keeping the locked editorial look (warm gold accent, charcoal ink,
Space Grotesk / Inter, soft shadows). Thin **line** icons only, `currentColor`, never
filled/multicolor. Decorative icons `aria-hidden`; icon-only buttons `aria-label`.

- **Job 1 — Header:** make it true white + add nav icons (Shop, Saved, Sign in, Cart),
  icons **with** labels. White bg → dark text/icons; gold only for logo/active/hover.
- **Job 2 — Icons app-wide:** admin sidebar nav, admin primary actions, storefront
  footer contact, product card/detail actions, /shop filters & sort, empty states,
  error "try again" buttons.
- **Guardrails:** no layout/spacing change beyond what the icon needs; no new colors
  outside existing tokens/palette; tap targets ≥40px; one dev server only; `tsc` +
  route render check before done.

## 3. Open questions (answered)

1. **Header A/B?** → **B** — keep the smart over-hero behaviour, but fix the scrolled /
   non-home state to a **solid white** fill (it was a broken transparent, see Plan).
2. **Icon library?** → **Yes, `lucide-react`** — one small tree-shakeable dep; only
   imported icons ship. Justified over hand-SVG for ~20+ icons (Ponytail).
3. **Status pill dot?** → **Yes** — tiny leading dot, colored by state, reusing the
   status colors already in `globals.css` (no new colors).

## 4. Plan

**Bug found:** the non-home header CSS was
`background: color-mix(in srgb, var(--rc-paper) 86%, transparent)` but `--rc-paper` is
never defined → the whole declaration is invalid → header fell back to **transparent**
(blur + hairline only). Option B sets a real `--rc-surface` (#fff) and fixes this.

**Files touched:**

- CSS: `app/redesign.css` (header → solid white, nav/footer icon sizing),
  `app/globals.css` (admin nav icons, `.status-dot`, button-icon alignment).
- Header: `app/(shop)/layout.tsx`, `components/{SavedNav,AccountNav,CartButton}.tsx`.
- Storefront: `components/{WishlistButton,ProductCard,FilterBar}.tsx`, shop/admin
  `error.tsx`, empty states.
- Admin: `AdminShell.tsx`, `admin/{products,orders,payments,inventory}/page.tsx`,
  new `app/admin/components/StatusDot.tsx` (shared dot + `tone(status)` mapper, reused
  by orders/payments/products).

**Icon map:**

| Where | Item | Icon |
|---|---|---|
| Header | Shop / Saved / Account·Sign in / Cart | `Store` / `Heart` / `User` / `ShoppingBag` |
| Admin nav | Dashboard/Orders/Products/Inventory/Notes/Payments/Settings | `LayoutDashboard` `ShoppingBag` `Bike` `Boxes` `StickyNote` `CreditCard` `Settings` |
| Admin actions | New product / Delete / Sign out / Notes toggle / hamburger | `Plus` `Trash2` `LogOut` `StickyNote` `Menu` |
| Footer | phone / location / account | `Phone` `MapPin` `User` |
| Product | Add / Wishlist | `Plus` / `Heart` (replaces hand SVG) |
| /shop | search / sort | `Search` `ArrowUpDown` |
| Empty / error | empty state / try again | `PackageOpen` / `RotateCcw` |

**Rejected:** hand-rolled inline SVGs (more code, drift risk for 20+ icons); a generic
`<Icon>` wrapper (lucide icons are already components — YAGNI).

## 5. Tasks

- [x] Install `lucide-react`
- [x] CSS: header white + nav/footer icon sizing (redesign.css)
- [x] CSS: admin nav icons + `.status-dot` + button-icon alignment (globals.css)
- [x] Header components + footer icons
- [x] WishlistButton / ProductCard / FilterBar icons
- [x] shop + admin error.tsx "try again" icon
- [x] AdminShell nav + actions icons
- [x] StatusDot + wire into orders/payments/products
- [x] Notes-toggle + empty-state icons
- [x] `tsc --noEmit` clean
- [ ] Visual render check — blocked: live server is `next start` (stale prod build); needs rebuild/restart or a `next dev`

## 6. Updates

- 2026-10-20 — spec written, plan approved (B / lucide yes / dot yes). Build started.
- 2026-10-20 — all edits done; `tsc --noEmit` clean. Found the server on :3000 is
  `next start` (production, serves a pre-built `.next`, no file watching), so the live
  pages still show the old build. A rebuild + restart, or switching to `next dev`, is
  needed to see the changes. No second dev server was started.
- 2026-10-20 — **Round 2: admin polish pass (pre-launch).** `tsc --noEmit` clean.
  - **Toolbars (all tabs):** `.admin-filters`/`.admin-adjust` unified — 42px controls,
    10px radius, white bg, visible focus ring. New `.admin-search` makes free-text
    search/reason inputs grow (`flex: 1 1 260px`) — fixes the cramped payments/orders/
    inventory search the owner flagged.
  - **Tables:** subtle `tbody tr:hover` row highlight for scanning.
  - **Status pill:** heavy solid-black `.status-pill` → light tonal pill (surface-strong
    + hairline) that pairs with the colour `StatusDot`; dots added to the dashboard
    "Recent orders" table too.
  - **Order detail (`orders/[id]`):** restructured — Items / Delivery / Status now sit in
    `.admin-card` panels instead of bare text. **Status change is now a `<select>`**
    (options = the backend's allowed `nextStates` only, so no illegal transition) + an
    "Update status" button, replacing the row of per-state buttons. The tracking field
    appears inline only when "shipped" is chosen and the button is disabled until it's
    filled (backend requires it). Server stays the authority — same `adminApi.transition`.
  - Files: `globals.css` (admin toolbar/table/status/card blocks), `orders/[id]/page.tsx`
    (rewrite), `orders/page.tsx` + `payments/page.tsx` + `inventory/page.tsx` (`admin-search`
    class), `admin/page.tsx` (dashboard status dots). Dashboard KPIs/charts were already
    carded — left as-is.
  - Still pending the same live visual check (server is `next start` on a stale build).

## 7. Explanation

### 1. What changed
- The storefront header is now a **solid white bar** (was accidentally transparent).
- **Line icons** (from `lucide-react`) now lead the items people scan: header nav,
  admin sidebar, admin action buttons, footer contacts, product cards, shop
  filters/sort, empty state, and the error "Try again" buttons.
- Admin status columns (orders, payments, products) get a **tiny colour-coded dot**.

### 2. Why it was needed
- The header CSS mixed an **undefined** variable (`--rc-paper`), which made the whole
  background rule invalid → the bar fell back to transparent. Visual bug + the brief
  asked for white.
- Plain text labels are slow to scan. A small leading icon gives each item a shape the
  eye catches first — especially in the dense admin tables and sidebar.

### 3. How it works, step by step
- **Header (Option B):** the `.rc-header` background is now `var(--rc-surface)` (#fff)
  with a hairline border. The existing over-hero behaviour is untouched: on the
  homepage, while the dark 3D hero is under the header, `body[data-over-hero]` keeps the
  bar transparent with white links; once you scroll past the hero (or on any other
  page) that flag drops and the solid white bar shows with dark ink. Because every icon
  uses `currentColor`, the icons flip white over the hero and dark on white for free.
- **Icons:** each is imported by name from `lucide-react`, so only the icons used ship
  in the bundle (tree-shaking). Decorative ones carry `aria-hidden`; icon-only controls
  already had `aria-label`. `strokeWidth` is set ~1.75 to match the thin editorial feel.
- **Status dot:** `StatusDot` maps any status word → one of four tones (ok / warn / bad
  / neutral) and renders an 8px dot. The tone colours are the **same green/amber/red**
  already used by the payment pills — no new colours introduced.

### 4. Files / functions changed
- `app/redesign.css` — header → solid white; sizing for nav/footer/search/sort/card-add
  icons; mobile search-wrapper fix.
- `app/globals.css` — `.admin-navlink` flex + icon size; `.btn-primary`/`.link-btn` icon
  alignment; new `.status-dot` tones; centred `.empty-mark`.
- `app/(shop)/layout.tsx` — `Store` on Shop; `MapPin`/`Phone`/`User` on footer contacts.
- `components/{CartButton,SavedNav,AccountNav}.tsx` — `ShoppingBag`/`Heart`/`User`.
- `components/WishlistButton.tsx` — hand-rolled heart SVG → lucide `Heart` (same
  fill-when-saved trick).
- `components/ProductCard.tsx` — "Add +" → `Plus` + "Add".
- `components/FilterBar.tsx` — `Search` inside the search field, `ArrowUpDown` on sort.
- `components/ProductGrid.tsx` — 🔍 emoji empty-mark → lucide `SearchX`.
- `app/(shop)/error.tsx`, `app/admin/error.tsx` — `RotateCcw` on "Try again".
- `app/admin/AdminShell.tsx` — sidebar nav icons (object NAV), hamburger → `Menu`,
  sign out → `LogOut`.
- `app/admin/components/StatusDot.tsx` — **new**: shared dot + tone mapper.
- `app/admin/{orders,payments,products,inventory}/page.tsx` — status dots, Notes toggle
  `StickyNote`, products New/Delete `Plus`/`Trash2`.

### 5. Important decisions
- **lucide-react over hand-SVG** — one tiny tree-shakeable dep for ~25 icons beats
  maintaining that many inline SVGs (Ponytail: a lib earns its place here).
- **Object NAV in AdminShell** over index-juggling a tuple — adding an icon field reads
  clearer than `[href, label, ownerOnly]` positional access.
- **Status colours reused, not invented** — the dot inherits the existing payment-pill
  palette, honouring the "no new colours" guardrail.
- **Rejected:** a generic `<Icon>` wrapper (lucide icons are already components — YAGNI).

### 6. Tests / verification
- `npx tsc --noEmit` → **clean, no errors** (validates every edited `.tsx`).
- Route status via the running server: `/`, `/shop`, `/admin`, `/admin/login` → all
  **200**, no error markers. **But** that server is `next start` on a stale build, so it
  does **not** yet reflect the new code — the visual check is still pending a rebuild.

### 7. Edge cases and limitations
- **Not visually verified yet** — needs a rebuild/restart or `next dev` (see Updates).
- The "Edit" link in the products table was left icon-less (not in the brief); only
  Delete/Notes there carry icons. Easy to add `Pencil` later if you want symmetry.
- `StatusDot` returns the neutral grey for any status not in its sets (e.g. `refunded`,
  `archived`), which is the intended fallback.
