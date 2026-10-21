# Frontend resilience (image fallback + error boundaries)

## 1. Task
- **Name:** Make the storefront fail soft — bad image data or a page crash must not take the whole site down.
- **Status:** Shipped (code-verified).
- **Started:** 2026-10-20.
- **Last updated:** 2026-10-20.

## 2. What you asked for
- Add a **proper image fallback** so a bad/invalid product image doesn't break the page.
- Add **error boundaries** so this kind of error "does not down the entire site."
- Make it **production ready**.

## 3. Open questions
All taken as sensible defaults (no blocker), flagged to you:
- **Placeholder** = a new local SVG `public/images/placeholder.svg`.
- **Allowed image sources** = local `/…` paths + `res.cloudinary.com` (mirrors `next.config.ts`).
- **Scope** = keep the existing root `error.tsx` + 404s; add `global-error.tsx` and per-area
  (`(shop)`, `admin`) boundaries on top.

## 4. The bug that triggered this
A product ("Speed") was saved with its image set to `https://in.pinterest.com/gaurovda/cycle-pic/` —
a Pinterest **page** link, not an image, on a host not allowed by `next.config.ts`. `next/image`
throws on an unconfigured host, and with no error boundary between the page and the root layout, the
whole route 500'd. Only two components render with `next/image` (`ProductCard`, `ZoomImage`), so those
were the crash surface.

## 5. Plan / what was built
**Image safety**
- `lib/img.ts` — `safeSrc()` (allow local + Cloudinary, else placeholder), `imgError` (onError →
  placeholder once), `PLACEHOLDER`.
- `components/SafeImage.tsx` — wraps `next/image`: sanitizes the src before render (kills the crash)
  **and** swaps to the placeholder if an allowed image fails to load at runtime.
- `public/images/placeholder.svg` — neutral "image unavailable" graphic.
- `next/image` spots → `SafeImage`: `ProductCard`, `ZoomImage`.
- Plain `<img>` spots → `safeSrc` (+ `onError` where the component is client): `cart`, `HomeSections`
  (server: `safeSrc` only), `ProductGallery` thumbs, admin `ProductForm` preview.

**Error boundaries**
- `app/global-error.tsx` — catches a crash in the **root layout itself** (self-contained styles +
  own `<html>/<body>`); the one case the existing `app/error.tsx` can't.
- `app/(shop)/error.tsx` — a shop-page crash renders inside the shop shell; rest of the site lives.
- `app/admin/error.tsx` — an admin-page crash renders inside the admin shell (sidebar stays).

## 6. Tasks
- [x] `lib/img.ts` + `SafeImage` + placeholder asset.
- [x] Swap `next/image` → `SafeImage` (ProductCard, ZoomImage).
- [x] `safeSrc`/`imgError` on all plain `<img>` product spots.
- [x] `global-error.tsx` + `(shop)/error.tsx` + `admin/error.tsx`.
- [x] Verify: tsc clean; home 200 with placeholder fallback; no `src` points at the bad host.

## 7. Explanation

**What changed.** Product images now route through a safety layer, and the app gained three error
boundaries. A bad image URL shows a placeholder instead of crashing, and a page error is contained to
its area instead of blanking the site.

**Why it was needed.** One product's image was a non-image URL on a disallowed host. `next/image`
throws on that, and with nothing to catch it, the whole page went down (HTTP 500).

**How it works, step by step.**
- *Render time:* every product `src` passes through `safeSrc()`. A local path or a Cloudinary URL is
  kept; anything else becomes `/images/placeholder.svg`. So `next/image` never receives a src it would
  throw on.
- *Runtime:* `SafeImage` (and plain `<img onError>`) also swaps to the placeholder if an allowed image
  still fails to load — e.g. a Cloudinary file was deleted.
- *Crash containment:* if any component still throws, the nearest `error.tsx` renders a calm "try
  again" in place of that area; a root-layout crash falls to `global-error.tsx`. The rest of the app
  keeps running.

**Files / functions changed.**
- New: `lib/img.ts`, `components/SafeImage.tsx`, `public/images/placeholder.svg`,
  `app/global-error.tsx`, `app/(shop)/error.tsx`, `app/admin/error.tsx`.
- Edited: `app/(shop)/components/ProductCard.tsx`, `ZoomImage.tsx`, `ProductGallery.tsx`,
  `home/HomeSections.tsx`, `app/(shop)/cart/page.tsx`, `app/admin/components/ProductForm.tsx`.
- Unchanged: `next.config.ts` (the sanitizer mirrors its allow-list — no need to widen it), backend.

**Important decisions.**
- *Sanitize at the source, not widen the config.* Adding `in.pinterest.com` would let the optimizer
  fetch arbitrary third-party pages and still wouldn't show a real photo. `safeSrc` is the correct fix.
- *One `SafeImage` for the two crash-prone spots; a shared `onError` for the rest.* Smallest honest
  diff that covers both the hard crash and broken-but-allowed images.
- *Boundaries on top of the existing ones.* `global-error` + per-area `error.tsx` give graceful,
  contained recovery without touching the working root `error.tsx` / 404s.

**Tests / verification.**
- `npx tsc --noEmit` — clean.
- Single clean dev server (cleared `.next` after an accidental double-server), port 3000:
  `/`, `/shop`, `/cart`, `/admin`, `/admin/orders` all **200**.
- Home page: **24 placeholder fallbacks**, **zero** "Invalid src prop" errors (previously it
  crashed), and **no `src=` attribute points at the Pinterest host**. The bad URL survives only in the
  serialized data payload, which is harmless.

**Edge cases and limitations.**
- The placeholder is a signal, not a fix — the owner should still set a real image on "Speed" in the
  admin. A guard that *rejects* a bad image URL on save (admin validation) was intentionally not added;
  say the word if you want it.
- `safeSrc` allows exactly the hosts in `next.config.ts`. Add a new image host in **both** places.
- Not yet eyeballed in a browser; verified by HTTP + rendered-HTML inspection.
