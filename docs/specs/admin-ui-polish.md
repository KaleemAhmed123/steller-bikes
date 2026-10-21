# Admin UI polish

## 1. Task
- **Name:** Admin UI polish — professional, minimalist, mobile-friendly.
- **Status:** In progress.
- **Started:** 2026-10-20.
- **Last updated:** 2026-10-20.

## 2. What you asked for
- Make the admin look **professional**, display content properly with **proper cards / UI components**.
- Make the **sidebar a bit wider**.
- **Use the wasted space on the right** — content looked cramped while the right side sat empty.
- Make it **mobile friendly**.
- Aesthetic: **minimalist professional**.

## 3. Open questions
1. **Mobile sidebar pattern** — *Answered:* slide-in drawer + hamburger.
2. **Content width on big screens** — *Answered:* fluid up to ~1440px.
3. **Sidebar width** — *Answered:* 260px.
4. **Depth of change** — *Answered:* polish within current design tokens (keep gold/charcoal + Space
   Grotesk/Inter), not a restructure.
5. **Mobile drawer breakpoint** — *Answered:* 900px (tablets keep the full sidebar, phones get the drawer).

## 4. Plan
Presentation only. No data, API, logic, column, or storefront change. Bulk of the work is one CSS
file; a small shell change adds the mobile drawer; table wrappers are one-line-per-table JSX.

- **Shell + sidebar** (`AdminShell.tsx` + CSS): sidebar 220→260px; add a slim mobile top bar with a
  hamburger that slides the sidebar in as an overlay (drawer) with a backdrop; taps + route change close it.
- **Width** (CSS): raise `.admin-main` cap 1100→1440px, responsive padding.
- **Cards** (CSS): apply the existing but unused `--shadow` token to KPI tiles, chart cards, note
  cards, the payment modal; lighter borders, consistent radius, subtle hover-lift on clickable rows.
- **Tables** (CSS + 1-line JSX per table): wrap each `<table>` in `.admin-table-wrap` — gives a
  rounded, shadowed card **and** horizontal scroll on phones so wide tables never break the layout.
- **Filters/forms** (CSS): `.admin-filters` / `.admin-adjust` stack full-width under ~640px.

**Rejected:** stacked card-per-row tables on mobile (needs per-cell markup on every page — far bigger
diff for the same readability; horizontal scroll is the lazy-correct fix).

### Files to touch
- `frontend/app/globals.css` — the admin block (~L883–1530).
- `frontend/app/admin/AdminShell.tsx` — top bar + drawer state.
- `frontend/app/admin/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `products/page.tsx`,
  `inventory/page.tsx`, `payments/page.tsx` — wrap the 8 tables.

## 5. Tasks
- [x] Sidebar 260px + refined styling (sticky, full-height).
- [x] Mobile top bar + drawer + backdrop in `AdminShell.tsx`.
- [x] `.admin-main` width 1440 + responsive padding.
- [x] Card shadows on KPI / chart / note / stat / table cards.
- [x] `.admin-table-wrap` CSS + wrap all 8 tables.
- [x] Filters/forms stack on mobile; `.admin-cols` stacks under 900px.
- [x] Verify: typecheck clean, all 7 admin routes compile + 200, dev log clean.
- [ ] Logged-in visual pass — blocked on a running backend + Atlas + seeded staff (owner's side).
- [x] Walkthrough (section 7).

## 6. Updates
- **2026-10-20** — Spec written; all 5 open questions answered; implementation started.
- **2026-10-20** — Shipped. Edited `globals.css` (admin block), `AdminShell.tsx` (drawer), wrapped
  8 tables across 6 pages. Verified at code level (typecheck + compile + render). Logged-in visual
  pass left to the owner since it needs the backend + DB running.

## 7. Explanation

**What changed.** The admin got a presentation-only polish: a wider 260px sidebar that becomes a
slide-in drawer on phones, content that now fills the screen up to 1440px instead of stopping at
1100px, soft shadows on every card, and every table placed inside a rounded card that scrolls
sideways on small screens instead of breaking the layout.

**Why it was needed.** The admin had no mobile handling at all — the fixed 220px sidebar crushed the
content on a phone. On a wide monitor a hard 1100px cap left the right third of the screen empty.
Cards were flat (the theme's shadow token was never used), and bare tables could overflow the page.

**How it works, step by step.**
- *Desktop:* sidebar is a 260px sticky column (stays in view as you scroll); content sits beside it
  and stretches up to 1440px.
- *Under 900px:* the sidebar is pulled off-screen and a slim dark top bar with a hamburger appears.
  Tapping the hamburger sets `navOpen`, which adds an `.open` class — the sidebar slides in over the
  page and a dark backdrop covers the rest. Tapping the backdrop, a nav link, or navigating to a new
  route closes it again.
- *Tables:* each `<table>` now lives in a `.admin-table-wrap` div — that div is the card (border,
  radius, shadow) and owns the horizontal scroll, so a 7-column table on a phone scrolls inside its
  card rather than stretching the whole page.
- *Under 640px:* filter/search bars and the stock-adjust form stack into full-width columns.

**Files / functions changed.**
- `frontend/app/globals.css` — admin block: sidebar 260px + sticky; new `.admin-topbar`,
  `.admin-hamburger`, `.admin-backdrop`; `.admin-main` cap 1100→1440 with responsive padding;
  `box-shadow: var(--shadow)` added to `.kpi`, `.chart-card`, `.stat`, `.note-item`; new
  `.admin-table-wrap`; table header tint + last-row border removed; two mobile media queries
  (900px drawer + `.admin-cols` stack, 640px form stacking).
- `frontend/app/admin/AdminShell.tsx` — added `navOpen` state, a close-on-route-change effect, the
  mobile top bar with the hamburger SVG, the backdrop, and the `.open` class on the sidebar.
- `page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `products/page.tsx`, `inventory/page.tsx`,
  `payments/page.tsx` — each table wrapped in `.admin-table-wrap` (8 tables total). No logic,
  columns, or data touched.

**Important decisions.**
- *Horizontal-scroll tables over stacked card-per-row.* Scroll is a CSS-only wrapper; stacking would
  need per-cell `data-label` markup on every page — a far bigger diff for the same readability.
- *Wrapper div owns the card, not the `<table>`.* `border-collapse` fights `border-radius`; wrapping
  gives clean rounded corners and the scroll boundary in one move.
- *Kept all tokens.* Reused the existing `--shadow`, `--surface`, `--border` so the admin matches the
  locked editorial direction — polish, not a reskin.

**Tests / verification.**
- `npx tsc --noEmit` — clean, no errors.
- Dev server: all 7 admin routes (`/admin`, `/orders`, `/products`, `/inventory`, `/payments`,
  `/settings`, `/notes`) compiled and returned HTTP 200; dev log had no errors.
- **Not done:** a logged-in visual pass — the authed admin needs the backend + Atlas + a seeded
  staff login running, which is the owner's environment.

**Edge cases and limitations.**
- On a phone, very wide tables scroll sideways by design — that's the intended trade-off, not a bug.
- The 900px breakpoint means tablets keep the full sidebar; phones get the drawer.
- The drawer has no open/close animation on the hamburger icon itself (icon stays static); the panel
  slides. Visual verification of the authed pages is still pending on the owner's running stack.
