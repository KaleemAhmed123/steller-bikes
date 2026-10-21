# Frontend Sprint 1 — P1 audit fixes

## 1. Task

- **Name:** Frontend Sprint 1 — fix the 6 release-blocking (P1) findings from the production-readiness audit.
- **Status:** shipped (verified)
- **Started:** 2026-10-21
- **Last updated:** 2026-10-21
- **Source:** [`docs/frontend-production-readiness-audit.md`](../frontend-production-readiness-audit.md)

## 2. What you asked for

> "Yes we can start with Sprint 1." — fix the P1 findings. Two decisions made via tappable questions:
> - **Mobile header:** icon-only compact nav (not a hamburger drawer).
> - **Testing:** ESLint + `jsx-a11y` now; defer Playwright smoke tests to a later task.

In scope — the 6 P1 findings:
- **FE-001** storefront header overflows on mobile.
- **FE-002** Cart link contrast 1.09:1.
- **FE-003** no homepage `<h1>` + heading-order skip.
- **FE-004** hydration mismatch from the inline `data-over-hero` script.
- **FE-006** no skip-to-content link.
- **FE-007** silent failures on non-form mutations.
- **FE-012** no ESLint (Playwright deferred).

Out of scope: all P2/P3 findings; the Express backend.

## 3. Open questions

| Question | Recommendation | Your answer |
|---|---|---|
| Mobile header pattern | Icon-only compact (CSS + tiny markup) | **Icon-only compact** |
| Test infra this sprint | ESLint now, Playwright later | **ESLint now, Playwright later** |
| FE-007 error surface shape | Small shared `ToastProvider` (generalize the existing cart toast) vs. bolt onto CartProvider | Took the default: **shared ToastProvider** |
| Footer heading level for FE-003 | `<h2>` (robust across all pages — going *up* a level is always valid; `<h3>` would still skip on auth pages that only have an `<h1>`) | Took the default: **`<h2>`** |

## 4. Plan

**FE-004 (hydration):** delete the inline `<script dangerouslySetInnerHTML>` in `(shop)/layout.tsx`. `HeaderHeroWatch` already sets `data-over-hero` before paint via `useLayoutEffect`, so the script is redundant; removing it makes the server HTML match the client → no mismatch, no flash.

**FE-002 (contrast):** the over-hero header gradient fades to transparent, so white nav text gets measured against the near-white page body. Strengthen the scrim so text always sits on dark-enough pixels (target ≥4.5:1).

**FE-003 (h1 + headings):** add a visually-hidden `<h1>` in the hero region (homepage had none); change footer column headings from `<h4>` to `<h2>` and update the CSS selector so they keep their look.

**FE-006 (skip link):** add a visually-hidden-until-focused "Skip to main content" link as the first focusable element in the shop layout and the admin shell, targeting `#main` / the admin main.

**FE-007 (error surface):** add a small `ToastProvider` (success + error variants), route the existing "Added to cart ✓" through it, and wrap the mutation handlers that currently fail silently: cart steppers + remove (`cart/page.tsx`), address make-default/remove + logout (`account/page.tsx`), card quick-add (`ProductCard.tsx`). Also disable the cart steppers while a request is in flight (folds in FE-008's core risk cheaply).

**FE-001 (mobile header):** wrap each nav link's text label in a `<span class="rc-nav-text">`; below ~560px hide `.rc-nav-text` (keeping an accessible name on the link) so only icons show and the row fits to 320px.

**FE-012 (ESLint):** add `eslint` + `eslint-config-next` devDeps, an `.eslintrc.json` extending `next/core-web-vitals` (includes `jsx-a11y`), and a `lint` script. Report (not auto-fix) the current lint state.

**Rejected alternatives:** hamburger drawer for the header (more code, user chose compact); bolting error state onto `CartProvider` (less reusable than a dedicated toast); footer headings as `<h3>` (still skips on auth pages).

## 5. Tasks

- [x] FE-004 remove inline over-hero script
- [x] FE-003 hero `<h1>` + footer `<h4>`→`<h2>` (+ CSS)
- [x] FE-006 skip link (shop + admin) + `.skip-link` CSS
- [x] FE-002 stronger over-hero scrim
- [x] FE-001 icon-only compact nav (markup + CSS)
- [x] FE-007 ToastProvider + wrap mutations + stepper in-flight lock
- [x] FE-012 ESLint (flat config) + `jsx-a11y` + lint script
- [x] Verify: `npm run typecheck` (clean), `npm run lint` (clean), `npm run build` (clean)
- [x] Live re-check: header/contrast/console/skip-link in the browser (Lighthouse A11y **100**, mobile header verified, hydration error gone)

## 6. Updates

- **2026-10-21** — spec created; two design questions answered (compact header, ESLint-only). Implementation starting.
- **2026-10-21** — all 6 fixes coded. **ESLint pivot:** `next lint` is deprecated in Next 15 and the legacy `.eslintrc.json` + ESLint 8 path failed to load `jsx-a11y`. Switched to the supported **ESLint 9 flat config** (`eslint.config.mjs` + `@eslint/eslintrc` FlatCompat, `lint: "eslint ."`). First lint run then hit a **corrupted `eslint-plugin-jsx-a11y` file** (`tfoot.js` was blank — a broken install, likely the Desktop/OneDrive sync); fixed by removing the package dir + reinstalling. Final: **lint clean (0/0), typecheck clean, build clean.** Live browser re-check still pending.

## 7. Explanation

### What changed
Seven fixes across the storefront + one tooling addition:
- A shared **ToastProvider** now renders one toast with a polite `status` region (success) and an assertive `alert` region (errors). The cart's old private toast was removed; `CartProvider` routes its "Added to cart" through the shared one.
- The **storefront header** collapses to **icon-only** on phones (≤560px) by hiding the text labels (kept in the DOM for screen readers).
- The **over-hero header scrim** became a solid-alpha dark background (plus a text-shadow) so white nav text passes contrast.
- The homepage gained a **visually-hidden `<h1>`**; footer column headings went `<h4>`→`<h2>`.
- A **skip-to-content** link is the first focusable element on both the shop layout and the admin shell.
- The **inline `data-over-hero` script** was deleted (the hydration-mismatch cause); `HeaderHeroWatch` already sets that state before paint.
- The cart **quantity steppers** lock while a request is in flight and surface errors; the "−" button is disabled at quantity 1.
- **ESLint 9 flat config** (`eslint.config.mjs`) with `next/core-web-vitals` (includes `jsx-a11y`) + a `lint` script.

### Why it was needed
These were the 6 release-blocking (P1) findings from the audit plus the no-lint gap: a clipped mobile Cart link, an invisible Cart label (1.09:1), a missing page `<h1>` and skipped heading levels, a hydration error on every homepage load, no keyboard skip link, silent failures on quick actions, and zero automated lint/a11y checks.

### How it works, step by step
1. `ToastProvider` wraps the whole storefront (outermost, so `CartProvider` and pages can call `useToast().show(msg, 'success'|'error')`).
2. Mutation handlers that used to fail silently (cart stepper/remove, address make-default/remove, card quick-add) now `try/catch` and call `show(..., 'error')`.
3. On the homepage, `HeaderHeroWatch`'s `useLayoutEffect` sets `data-over-hero` before paint; with the inline script gone, the server HTML and client match → no hydration error.
4. At ≤560px, `.rc-nav-text` is visually hidden; icons + badges remain, so the row fits to 320px.

### Files / functions changed
- **New:** `app/(shop)/components/ToastProvider.tsx`, `frontend/eslint.config.mjs`.
- **Removed:** `frontend/.eslintrc.json` (replaced by flat config).
- `app/(shop)/layout.tsx` — wrap in `ToastProvider`, delete inline script, add skip link, footer `<h2>`, Shop label span.
- `app/(shop)/components/CartProvider.tsx` — use shared toast; drop private toast.
- `app/(shop)/components/{CartButton,SavedNav,AccountNav}.tsx` — wrap labels in `.rc-nav-text`.
- `app/(shop)/components/hero/BikeHero.tsx` — visually-hidden `<h1>`.
- `app/(shop)/components/ProductCard.tsx` — quick-add shows an error toast.
- `app/(shop)/cart/page.tsx` — in-flight `run()` lock + error toast; disable "−" at qty 1.
- `app/(shop)/account/page.tsx` — error handling on make-default/remove/logout.
- `app/admin/AdminShell.tsx` — skip link + `#admin-main`.
- `components/SafeImage.tsx` — explicit `alt` (satisfies jsx-a11y).
- `app/redesign.css` — scrim, skip-link, mobile icon-only nav, footer `h2` selector.
- `app/globals.css` — `.toast.is-error`.
- `package.json` — `lint` script + eslint/eslint-config-next/@eslint/eslintrc devDeps.

### Important decisions
- **Shared ToastProvider** over bolting error state onto `CartProvider` — reusable across non-cart actions.
- **Footer headings `<h2>`** (not `<h3>`) — going *up* a level is always valid, so it never skips even on auth pages that only have an `<h1>`.
- **ESLint 9 flat config** — `next lint` is deprecated in Next 15; Next itself points to the ESLint CLI.
- Stronger scrim uses a **solid-alpha background-color** (not a gradient-to-transparent) because axe can only composite a solid colour; the old gradient left white text measured against the light page body.

### Tests / verification
- `npm run lint` → **0 errors, 0 warnings**.
- `npm run typecheck` → clean.
- `npm run build` → clean (26 routes; a transient `.next` ENOENT cleared after `rm -rf .next`).
- Live (Chrome DevTools, dev server): Lighthouse mobile **Accessibility 100** (was 95) — contrast + heading-order pass; **hydration error gone** from console; a11y tree shows the `<h1>`, footer `<h2>`, skip link, and both toast live-regions; mobile screenshot shows the icon-only header with no clipping.

### Edge cases and limitations
- **ESLint install was corrupted once** (`jsx-a11y/tfoot.js` blank — a broken install, likely the Desktop/OneDrive sync); fixed by reinstalling. If it recurs, move the project off the synced folder or `rm -rf node_modules && npm install`.
- The error-toast path is verified structurally (both live regions render, handlers wrapped, checks green) but a real failing request wasn't forced in the browser.
- FE-008's deeper fix (debounce vs. lock) is only partially addressed — the stepper is now locked per-line, which removes the race; no debounce was added.
- Deferred P2/P3 audit items (3D-on-mobile, OG/JSON-LD, admin bundle split, color-mix fallback, the guest-401 console noise, three.js version drift) are unchanged.

## 8. Follow-ups (not in this sprint)
- Sprint 2 (P2): FE-005 keyboard radio group, FE-009 skip 3D on mobile, FE-011 OG + JSON-LD, FE-014 unsaved-changes guard, FE-016 unify CSS tokens, FE-010 admin chart split, FE-013 autocomplete, FE-017 color-mix fallback.
- Playwright smoke tests (deferred from FE-012).
- Re-run Lighthouse on the deployed Vercel build for real Core Web Vitals (FE-025).
