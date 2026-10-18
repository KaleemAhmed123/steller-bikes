# Build step 7 — Editorial revamp, Phase 3 (transactional pages + admin light pass)

**Date:** 2026-10-18 · **Status:** In progress · **Last updated:** 2026-10-18

> Phase 1 (build step 6) brought the design-token layer, ProductCard and product detail into the
> editorial system. Phase 2 added the atmospheric pastel orbs. Phase 3 is the last rollout: the
> **cart, checkout, account, auth and order pages**, which still wore the legacy `globals.css`
> styling — gold buttons, bold sans headings, no orbs. The **admin** back-office gets a *light*
> pass only (it is an operator tool; density beats prettiness there).

## 1. What you asked for
- Bring the pages still on legacy `globals.css` into the editorial system so the whole storefront
  reads as one boutique.
- **Decisions locked this session:**
  - **Admin = light pass** (canvas + serif headings + ink buttons, keep it dense and fast to scan),
    not the full editorial treatment.
  - **Orbs = yes**, one subtle pastel orb per transactional page, like the rest of the storefront.
- Standing rules: don't touch cart/checkout *logic* (server stays authoritative on price/stock,
  transaction + oversell guard untouched); ponytail (smallest diff, reuse the existing tokens).

## 2. Open questions (answered)
- **Approach — restyle in place vs. rework markup to `rc-` classes?** → *Restyle in place.* Matches
  Phase 1 ("restyled in place, no markup change needed"), smallest diff, keeps the working
  cart/checkout markup untouched.
- **Flip the legacy `--accent` (gold) token globally?** → *No.* `.btn-primary` uses `--accent` as
  its *text* colour on a charcoal background; flipping the token to ink would make that text
  invisible. Fixed per-rule instead.
- **Admin scope?** → *Light pass* (see above).
- **Orbs on transactional pages?** → *Yes* (see above).

## 3. Plan
**One file: `frontend/app/globals.css`.** No `.tsx` markup changes — every target class already
exists on the pages. Surgical edits to the legacy rule groups, pointing them at the editorial
`--rc-*` tokens and `--font-display` (EB Garamond).

Why this is the lazy *and* correct fix: `.btn-primary` is shared by **every** customer page and the
admin pages, while the editorial shop components use `.rc-btn`. So restyling `.btn-primary` once
flips all of them to the ink pill and cannot touch the already-editorial components. Same logic for
the shared field/heading rules — fix at the shared rule, not per page.

## 4. Tasks
- [x] Buttons: `.btn-primary` → ink pill, weight 500, light text; `.btn-ghost` hover off gold → ink.
- [x] Links: `.auth-links a`, `.link-btn`, `.empty a` → ink + underline; `.order-row:hover` border → ink.
- [x] Headings → EB Garamond 500: cart / checkout / order `h1`, `.auth-card h1`, `.account-head h1`,
      `.account-section h2`.
- [x] Soften the loudest weights: `.cart-line-name`, `.cart-line-total`, `.address-label` (700/750 → 600).
- [x] Admin light pass: `.admin-h1` → serif 500; focus ring off gold → ink; admin brand tag, active
      nav and status pill off gold → ink/white.
- [x] Orbs: one soft `::before` orb per page wrapper (`.cart-page`/`.checkout-page`/`.auth-page`/
      `.account-page`/`.order-page`), a different pastel each, behind content (`z-index:-1`).
- [x] Verify: `next build` clean (dev stopped first) + eyeballed login/cart/admin-login in the browser.

### Gold still outside this phase's scope (flagged, not changed)
- `.nav a:hover` (header nav hover) and `.chip.active` (shop filter chip) still use gold `--accent`.
  They live on the already-approved header/shop surfaces, so left untouched. A one-line follow-up can
  retire them if the owner wants gold gone everywhere.

## 5. Deliberately NOT changing
- No cart/checkout **logic**; no markup restructure; no new dependencies.
- Not flipping the global `--accent`/`--primary`/`--border` tokens (invisible-button risk; see Q2).
- Header/footer/nav — already editorial, out of scope.
- Dead `.btn-gold` rule left as-is (unused; a later cleanup can drop it).

## 6. Updates
- *2026-10-18* — Phase 3 planned; admin=light, orbs=yes confirmed by the owner. Implementing.
- *2026-10-18* — Phase 3 shipped. All edits in `globals.css` (no `.tsx` changes). `next build` clean;
  login + admin-login verified serif/ink/orb in the browser. Found and fixed one extra gold link
  (`.empty a`, the empty-cart "Browse cycles" link) and the admin gold chrome during verification.
  Two header/shop gold spots left as an out-of-scope follow-up (see §4).

## 7. Explanation

### 1. What changed
The cart, checkout, account, auth (login / signup / forgot / reset / verify) and order pages — plus
a light touch on the admin back-office — now wear the editorial system instead of the old gold-and-
bold-sans look. All of it is CSS in `frontend/app/globals.css`; no page markup changed.

### 2. Why it was needed
These were the last pages still on the pre-redesign styling. A shopper moving from the (editorial)
product page into the cart hit a gold button and a bold sans heading — a visible seam. Phase 3
removes that seam so the whole journey reads as one shop.

### 3. How it works, step by step
1. The editorial tokens (`--rc-ink`, `--rc-surface`, `--rc-hairline*`, the `--rc-orb-*` pastels) and
   the serif font variable (`--font-display` = EB Garamond) were **already global** from Phase 1.
   Phase 3 just points the legacy page rules at them.
2. **Buttons:** `.btn-primary` is the one button class shared by every customer page *and* the admin
   pages (the editorial shop components use a different class, `.rc-btn`). Restyling `.btn-primary`
   once — charcoal gold-text pill → **ink pill, white text, weight 500** — flips every
   cart/checkout/account/auth/admin button in a single edit, and can't touch the editorial
   components. That is the whole reason the diff is small.
3. **Headings** get `font-family: var(--font-display)` at weight 500, so page titles render in the
   light serif that signals "premium" across the rest of the site.
4. **Links and hovers** that were gold (`--accent`) now use ink, with a 3px-offset underline so they
   still read as links.
5. **Orbs:** each page wrapper (`.cart-page`, `.checkout-page`, `.auth-page`, `.account-page`,
   `.order-page`) gets a soft blurred pastel `::before` bloom, a different colour each, sitting
   **behind** the content via `z-index:-1`. No markup change — the wrappers already existed.
6. **Admin (light pass only):** serif section title (`.admin-h1`), ink focus ring, and the gold
   chrome (brand tag, active nav item, status pill) flipped to ink/white. Kept dense on purpose —
   admin is an operator tool, not a shop window.

### 4. Files / functions changed
- **`frontend/app/globals.css`** — the only file. Edited rule groups: `.btn-primary`(+hover),
  `.btn-ghost`(+hover), `.link-btn`, `.auth-links a`, `.empty a`, `.order-row:hover`, the five page
  `h1`/`h2` heading rules, `.cart-line-name`, `.cart-line-total`, `.address-label`, `.admin-h1`,
  `.search/.price-input:focus`, `.cart-count`, `.admin-brand span`, `.admin-navlink.active`,
  `.status-pill`. Appended one new block: the per-page orb `::before` rules.
- **`docs/specs/storefront-redesign/build-step-7.md`** — this write-up.

### 5. Important decisions
- **Restyle in place, not re-markup.** Matches Phase 1, keeps the cart/checkout logic untouched,
  smallest diff.
- **Did NOT flip the global `--accent` token.** `.btn-primary` used `--accent` as its *text* colour
  on a dark background; flipping the token to ink would have made that text invisible. Fixed each
  rule instead — more lines, but no surprise breakage.
- **Admin stays dense (light pass).** Full editorial on a data-heavy ops tool would hurt scanability.
- **Orbs via `z-index:-1` on the existing wrapper** so no page needed a new positioned container.

### 6. Tests / verification
- `cd frontend && npm run build` — compiled clean, all 24 routes, no type/lint errors (ran with
  `next dev` stopped first, per the known dev-chunk-corruption rule).
- Browser (dev server): `/login` → serif title, ink pill, underlined ink links, lavender orb behind
  the card. `/admin/login` → serif heading, ink button, ink focus ring. `/cart` empty-state link
  caught still-gold and fixed. Backend was not running, so populated cart/account/order states were
  not exercised live — their rules are shared with the verified pages, so the risk is low but they
  are **not** visually confirmed yet (see limitations).

### 7. Edge cases and limitations
- **Not visually confirmed with real data:** populated cart, checkout form, account dashboard, order
  history and confirmation need the backend running on `:8000`. The styling is shared CSS, so it is
  very likely correct, but a logged-in pass with the API up is the honest final check.
- **Orb layering** relies on the page wrapper's ancestors being transparent (they are on the verified
  pages). If a future wrapper gets an opaque background, a `z-index:-1` orb could hide behind it.
- **Two gold spots remain** on the header/shop surfaces (§4) — deliberately out of scope.
- Dead `.btn-gold` rule left in place (unused; cheap future delete).
