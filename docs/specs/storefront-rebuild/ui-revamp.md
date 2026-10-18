# UI/UX Revamp — premium-minimalist storefront

**Status:** Shipped (code level; production build clean) · **Started:** 2026-10-16 ·
**Last updated:** 2026-10-16

> The deferred visual pass, done after checkout + admin worked. **Styling/layout/type/motion only** —
> no server, money, or stock logic touched. Storefront gets the full treatment; admin a light touch
> (inherits the new tokens + type).

## 1. Grill outcomes — answered 2026-10-16

| # | Question | Answer |
|---|----------|--------|
| 1 | Palette | **Evolve the accent** — charcoal base, warm **gold** accent (off the lime). |
| 2 | Typography | **Premium Google-font pairing** — Space Grotesk (display) + Inter (body). |
| 3 | Motion | **Subtle & tasteful** — hover lifts, smooth transitions, scroll-reveal. |
| 4 | Scope | **Storefront deep + admin light-touch.** |
| 5 | Light/dark | **Light base + dark dramatic sections** (hero, footer). |
| 6 | Accent colour | **Warm gold** (`#c0974a`). |
| 7 | Hero | **Full-bleed image hero + gradient overlay** (uses `public/images/hero.jpg`). |
| 8 | Polish | **Yes** — loading skeletons, designed empty states, add-to-cart toast. |

## 2. What changed (walkthrough)

### Design tokens (`app/globals.css` `:root`)
- New palette: warm near-white bg, charcoal ink, **warm-gold accent** (`--accent`), a near-black
  `--dark` for feature sections, `--accent-ink` for text on gold. Because components already used
  `--accent`/`--primary`, the gold flows everywhere (chips, cart badge, buttons, admin) automatically.
- Radius, shadow, and **font variables** added.

### Typography
- `next/font/google` self-hosts **Space Grotesk** (headlines) + **Inter** (body); variables set on
  `<html>` in `app/layout.tsx`, consumed via `--font-display` / `--font-body`. No layout shift, no
  external request.

### Storefront
- **Hero** on the home page: full-bleed photo, gradient overlay, big headline + gold CTA.
- **Sticky glass header**; refined product cards (hover lift + image zoom, rounded, gold on hover).
- **Dark footer** feature section in the shop layout.
- **Scroll-reveal** (`RevealOnScroll`): elements marked `data-reveal` fade/slide in on view. Adds
  `.js-reveal` to `<html>` only when JS runs, so no-JS and reduced-motion show everything instantly.
- **Add-to-cart toast** (in `CartProvider`): a transient "Added to cart ✓" on every add.
- **Skeletons**: `(shop)/loading.tsx` during route transitions (filter changes); cart page skeleton
  while its fetch runs.
- **Empty states**: iconed, friendlier empty cart / no-results.

### Admin (light touch)
- Inherits the new fonts + gold accent + spacing via shared tokens; dense operator tables kept.

## 3. Files changed

- `app/layout.tsx` — next/font (Space Grotesk + Inter) on `<html>`.
- `app/globals.css` — tokens, type scale, hero, sticky header, cards, buttons (`.btn-gold`), dark
  footer, skeletons, toast, scroll-reveal, empty states.
- `app/(shop)/layout.tsx` — mount `RevealOnScroll`, add dark footer.
- `app/(shop)/page.tsx` — hero section + `data-reveal` on cards + section title.
- `app/(shop)/components/RevealOnScroll.tsx` (new) — IntersectionObserver reveal.
- `app/(shop)/components/CartProvider.tsx` — toast state + render.
- `app/(shop)/loading.tsx` (new) — skeleton grid.
- `app/(shop)/cart/page.tsx` — skeleton + iconed empty state.

## 4. Verification

- `npm run build` (frontend) — **clean**, all 10 routes compile with the new fonts/styles.
- **Browser QA pending with the owner** (owner drives the browser check).
- If a dev page ever renders **unstyled** with `/_next/static/*.css` 404s, the `.next` cache is in a
  build↔dev conflict: stop `next dev`, delete `frontend/.next`, and start `npm run dev` again.

## 5. Limitations / later

- Product images are still the sample set; real photos will lift it further.
- Admin kept functional (by decision) — a deeper admin restyle is optional later.
- No dark-mode toggle (chose light base + dark sections, not a full dark theme).
