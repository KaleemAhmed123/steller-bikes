# Build step 8 — Stellar rebrand · hero revamp · cart-reset fix

**Status:** Built; frontend + backend typecheck clean. `next build` pending (dev was live on :3000).
**Date:** 2026-10-19.

This step does three things from one working session: (1) fixes a first-add-to-cart connection
reset, (2) rebrands the storefront from "Stellar Bikes" to **Stellar Bikes** with the real logo + the
owner's contact, and (3) overhauls the hero + second 3D moment for a faster, livelier first visit.

---

## 1. Cart reset fix — `net::ERR_CONNECTION_RESET` on the first add

### What was wrong
The first add-to-cart of a session failed with `net::ERR_CONNECTION_RESET`, then every later add
worked. The cart code was correct; the reset was at the TCP layer.

### Root cause
Node's HTTP server closes idle keep-alive sockets after **5 seconds** (`keepAliveTimeout` default).
Chrome pre-opens (pre-connects) a socket to the API and reuses it for the first real request — right
as Node closes it — so the first request hits a dead socket and is reset. Chrome then retries on a
fresh socket and it works. The cart calls are the **first browser→API connections** of a session
(products/settings are fetched server-side by Next.js), so this always bit the first add.

### Fix
[`backend/src/index.ts`](../../../backend/src/index.ts) — capture the server and hold idle sockets
longer than any browser does:
```js
server.keepAliveTimeout = 65_000;
server.headersTimeout   = 66_000; // must exceed keepAliveTimeout
```
Verified: the changed server boots (`Connected to MongoDB` → `API listening` → `/health` 200).

---

## 2. Stellar rebrand

### What changed
- **Logo:** extracted from the owner's logo image into a tight **transparent PNG**, recolored to the
  hero's electric blue (`--rc-hero #3d82ff`) so it matches the site. Lives at
  [`frontend/public/brand/stellar-logo.png`](../../../frontend/public/brand/stellar-logo.png).
  The header/footer `Wordmark` now renders this image instead of the old code-drawn SVG mark.
- **Name:** every user-facing "Stellar Bikes" → "Stellar Bikes" — browser-tab titles (home, shop,
  product, collection, not-found), header/footer, hero + section labels, Razorpay payment name, and
  the admin header/login. (Two CSS **comments** still say "Raju"; not user-facing, left alone.)
- **Contact:** footer "Store" column shows **Saleem** + a tappable **+91 80901 09621**; the copyright
  line reads `© Stellar Bikes · stellarbikes.in`. The homepage showroom's Contact fact falls back to
  `Saleem · +91 80901 09621` when the admin store-settings are blank (live settings still win).

### How the logo was made (so it can be reproduced)
1. Trim the white margin from the source JPEG.
2. Build an alpha mask from each pixel's distance from white (covers orange shapes **and** the dark
   wheel; white → transparent) — keeps smooth anti-aliased edges.
3. Fill every opaque pixel with `#3d82ff`. Output PNG.
   (`sharp`, already installed, in a throwaway script — no runtime dependency added.)

---

## 3. Hero + second-3D revamp

### Asked for (verbatim intent)
Loading indicator for the hero 3D; first visit lags / bad UX; replace the second-section bike with a
different, modern 3D element that takes **less vertical space** and has **no background panel**;
optimize without losing quality; **shorten the hero scroll by 25%** so the 3D finishes sooner; keep
the **text moving from the first scroll** so it reads as part of the animation; don't feel stuck/boring.

### Open question (answered)
*What 3D element replaces the bike in the "Engineered to look…" section?* →
**3D Stellar logo mark** (owner's choice).

### What changed

**a) Loading indicator (hero)** — the 3D model is one 2048² texture; the canvas showed nothing while
it loaded. Added a loading poster over the hero canvas: a dim, shimmering bike silhouette + a blue
spinner + "Preparing the ride…", which fades out the instant the model is ready.
- [`BikeCanvas.tsx`](../../../frontend/app/(shop)/components/hero/BikeCanvas.tsx): the `Bike`
  component fires an `onReady` callback from a `useEffect` — it only mounts after the GLB's Suspense
  resolves, so that is exactly "model ready".
- [`BikeHero.tsx`](../../../frontend/app/(shop)/components/hero/BikeHero.tsx): a `ready` state hides
  the `.rc-hero-loader` overlay. Only shown when WebGL is usable (fallback paths are instant).

**b) New 3D element — extruded Stellar logo mark** — the second section's same-bike turntable is
replaced by the **logo mark** (the geometric cyclist + wheel) traced from the real logo and extruded
into a glossy blue emblem that slowly turns, floating with **no background panel**.
- Mark traced from the logo to [`stellar-mark.svg`](../../../frontend/public/brand/stellar-mark.svg)
  (via `potrace`, installed `--no-save` and removed — no runtime dependency; the SVG is committed).
- [`LogoCanvas.tsx`](../../../frontend/app/(shop)/components/hero/LogoCanvas.tsx) (new): loads the SVG
  (`SVGLoader`), builds `ExtrudeGeometry` per shape, centres it, applies a blue metallic material
  (matches the hero), slow Y rotation + gentle `Float`, transparent canvas, one light bloom pass.
- [`Brand3D.tsx`](../../../frontend/app/(shop)/components/hero/Brand3D.tsx) now mounts `LogoCanvas`.
  Old `BrandCanvas.tsx` deleted. This is also a real optimization: the section no longer
  parses/clones the 2.3 MB bike or renders a reflective floor — it draws a tiny SVG extrusion.

**c) Less vertical space + no panel (CSS)** — [`redesign.css`](../../../frontend/app/redesign.css):
`.rc-brand3d-stage` height `clamp(340px,46vh,520px)` → `clamp(240px,34vh,380px)`, background panel
removed (transparent, overflow visible so the glow spills); `.rc-brand3d` gets tighter section
padding.

**d) Shorten hero scroll 25%** — the pinned scroll end `+=220%` → `+=165%` in `BikeHero.tsx` (both the
camera pin and the headline timeline). The camera sequence finishes a quarter sooner.

**e) Text moves from the first scroll** — the first headline used to sit still for the first ~26% of
scroll (felt "stuck"). The timeline now drifts + fades it from scroll ~0, so motion reads immediately.

**f) Model optimization (no visible quality loss)** — the GLB's weight was a single **2048² PNG**
base-color texture (2.27 MB). Re-encoded to **WebP at 1024²** + quantized geometry
(`@gltf-transform`): **2.39 MB → 104 KB** (~96% smaller; GPU memory 22 MB → 5.6 MB). WebP +
`KHR_mesh_quantization` are standard glTF extensions three reads natively (no decoder, no CDN). The
original is backed up outside the repo (recoverable from git too).

### Important decisions
- **Mark, not full wordmark,** for the 3D emblem — a wide "STELLAR" wordmark goes edge-on (invisible)
  when it rotates; a compact mark reads from every angle.
- **WebP 1024 over Draco/meshopt** — the weight was a texture, not geometry, and WebP needs no runtime
  decoder (Draco/meshopt would add a CDN/wasm dependency, against the "zero extra downloads" grain).
- **Reused the `Wordmark` component API** so the logo swap didn't touch every call site.

### Edge cases / limits
- The blue logo is a fixed color (can't recolor per surface like the old vector mark did) — fine on
  the current light header/footer; a dark bar would need a light variant.
- No-WebGL / reduced-motion: the hero + second section fall back to the static bike silhouette.
- **`next build` not yet run** (dev was live) — typecheck is clean both sides; a production build +
  an in-browser look at the hero, the loader, and the rotating emblem are the last verification.
- To revert the model: restore the original GLB from git (`git checkout -- frontend/public/models/bicycle.glb`).
