# Build step 3 — Bike polish + product carousels restored (walkthrough)

**Date:** 2026-10-18 · **Status:** shipped (code + live-verified in a real WebGL browser)

After build step 2, the feedback was: **make the hero bike look more real**, and **bring back the
"expanded" product sections** that were trimmed off the homepage — as a proper carousel, close to
how they looked before. This step does both, keeping 3D the star.

> On "recover from history": there was nothing to recover (the repo has **no commits, no stash, no
> reflog**). It didn't matter — the section components (`HomeRail`, `EditorialFeature`, `OfferBand`,
> `KidsBlock`) and the derived data (`loadHomeData` still returns `newArrivals / featured / offers /
> kids`) were all **still in the codebase**. Build step 2 only unplugged them from the homepage. So
> restoring was wiring, not rebuilding.

---

## 1. What changed

- **The hero bike reads more premium.** Within the one-fused-mesh ceiling of the current model:
  - The baked paint is upgraded to a **physical material with a thin clearcoat** — a lacquered
    sheen + sharper reflections the single baked texture can't give on its own.
  - **Filmic tone mapping** (ACES) + a small exposure bump → cinematic highlight roll-off.
  - **Anisotropic texture filtering** → the texture stays crisp at grazing angles.
  - **One extra overhead light strip** → a bright streak travels across the clearcoat as the camera
    moves.
  - The **second 3D moment** (the turntable) gets the exact same polish via a shared helper, so both
    3D beats match.
- **The product rails are back on the homepage — as real carousels.** Four sections restored:
  **New arrivals · Staff picks · On offer · Kids & family.** Each is a horizontal, snap-to-card
  track with **prev/next arrow buttons and page dots** (the dot for the current page elongates in
  the section's accent colour). The **Collections link-cards strip was kept** (both navigation
  styles coexist, per the brief).
- **3D stays the star.** The carousels sit **below both 3D moments**: hero → categories → 2nd 3D
  moment → carousels → collections link-cards → showroom.

## 2. Why it was needed

The step-2 homepage was deliberately lean (3D-forward), but it hid the actual products one tap away.
The owner wanted the browsable product sections visible again without losing the 3D feel — and
wanted them to feel designed (a carousel), not just a flat strip. And the hero bike, while
cinematically lit, still read as a plain low-poly model; a clearcoat + filmic grade pushes it toward
"premium brand visual" without the cost/risk of sourcing a new heavy model.

## 3. How it works, step by step

1. **`paint.ts`** exports `upgradePaint(std, maxAnisotropy)`: it builds a fresh
   `MeshPhysicalMaterial`, copies over the baked `color / emissive / map / normalMap / aoMap`, sets
   `clearcoat`, higher `envMapIntensity`, lower `roughness`, and max texture anisotropy. It is built
   **by hand on purpose** — calling `MeshPhysicalMaterial.copy(standardMaterial)` throws (it reads
   clearcoat-only fields a standard material doesn't have), which had crashed the canvas into the
   fallback.
2. **`BikeCanvas` / `BrandCanvas`** read `gl.capabilities.getMaxAnisotropy()`, then run every mesh's
   material through `upgradePaint`. Both canvases set `toneMapping: ACESFilmic` + `exposure 1.08` on
   the renderer. `BikeCanvas` adds one more `<Lightformer>` strip overhead.
3. **`RailCarousel`** (new client component) renders a flex track of `ProductCard`s. Native scroll
   does the moving; the arrow buttons call `scrollBy(±0.92 × viewport)` and the dots call
   `scrollTo(page × viewport)`. A `ResizeObserver` + scroll listener re-measure `scrollWidth /
   clientWidth` to compute the page count, the active dot, and whether each arrow is disabled
   (at-start / at-end). Arrows/dots hide when the track isn't scrollable.
4. **`HomeCarousels`** (in `HomeSections.tsx`, server component) maps the home data into four
   `RailCarousel`s with per-section eyebrow/title/accent/href. Offers and Kids self-hide when empty.
5. **`page.tsx`** renders `<HomeCarousels data={data} />` between the second 3D moment and the
   collections link-cards.

## 4. Files / functions changed

**New:**
- `app/(shop)/components/hero/paint.ts` — `upgradePaint()` shared material helper.
- `app/(shop)/components/home/RailCarousel.tsx` — the arrows-+-dots product carousel.
- `HomeCarousels` (in `components/home/HomeSections.tsx`) — the four restored rails.

**Edited:**
- `app/(shop)/components/hero/BikeCanvas.tsx` — `useThree` for anisotropy, `upgradePaint`, filmic
  tone mapping, extra light strip.
- `app/(shop)/components/hero/BrandCanvas.tsx` — same polish via `upgradePaint` + filmic grading.
- `app/(shop)/page.tsx` — wired `HomeCarousels` in below the 3D.
- `app/redesign.css` — carousel track (flex, so it overflows and scrolls), arrow buttons, page dots,
  dark-band variants.

**Not touched:** backend (route/schema/logic), the data model, the collections link-cards, the hero
camera choreography, and the model asset itself.

## 5. Important decisions

- **Polished the existing model, did not source a new one.** The owner chose polish over a heavy
  (~5–30 MB) realistic/multi-part download. Clearcoat + filmic + anisotropy is the realistic ceiling
  for a single fused mesh; true realism / wheel-spin still needs a different asset.
- **`upgradePaint` built by hand, not `.copy()`.** `MeshPhysicalMaterial.copy(standardMaterial)`
  throws `reading 'x'` (clearcoat fields the source lacks) and crashed the canvas to fallback —
  caught during live testing, fixed by assigning fields explicitly.
- **Carousel is flexbox, not CSS grid.** Grid `minmax(0, …)` auto-columns **shrink to fit** the
  container, so the track never overflowed and there was nothing to scroll. `flex: 0 0 auto` + a
  `calc()` width keeps cards a fixed size and forces the overflow a carousel needs.
- **`ResizeObserver` drives the measurement.** A single on-mount measure runs before the flex layout
  settles (dots/arrows end up wrong); the observer re-measures once the real width is known.
- **Kept the link-cards.** The brief said "add rails, keep link-cards" — both coexist.

## 6. Tests / verification (actually run)

- **Frontend typecheck** (`tsc --noEmit`): clean.
- **Production build** (`next build`): clean — all 18 app routes; homepage first-load JS ~114 kB
  (Three.js / GSAP / postprocessing still code-split).
- **Real WebGL browser (Chrome DevTools, dev server on Atlas data):**
  - Hero **3D canvas mounts and renders** the polished bike (blue clearcoat frame, gold/blue
    rim-light reflections, filmic grade). **No console errors** — the earlier `reading 'x'` crash is
    gone; only the expected guest 401 + harmless Three deprecation / shader-precision warnings
    remain.
  - All four carousels render: New arrivals (8 cards → arrows + 2 dots), Staff picks (6 → arrows + 2
    dots), On offer (5 → arrows, scrolls to the 5th card), Kids (4 → fits exactly, no controls).
  - **Clicking the next arrow scrolled the track** (4 → 1160 px) — hydration + handlers confirmed
    live.

> Debugging note: the first browser pass showed the carousel non-interactive and the hero on its
> line-art fallback. Root cause was **running `next build` while `next dev` was live on the same
> `.next` folder** — it overwrote the dev chunks, so `main-app.js` / `app-pages-internals.js` 404'd
> and nothing hydrated. Fixed by cleaning `.next` and restarting dev; thereafter builds were run
> only with the dev server stopped.

## 7. Edge cases and limitations

- **Still a single-mesh model** → clearcoat is applied to the whole bike (tyres get sheen too), and
  there is still no per-part animation (no wheel-spin / exploded view). Documented ceiling; needs a
  multi-part asset.
- **Dots use a rounded page count.** A section that overflows by less than ~half a viewport (e.g.
  On offer, 5 cards) shows arrows but no dots — the arrow still reveals the extra card.
- **Two WebGL canvases** — unchanged from step 2 (hero pauses off-screen; the turntable mounts on
  visibility).
- **This automated browser renders WebGL**; a visitor's device without WebGL still gets the existing
  line-art `HeroFallback`.

---

## Update — 2026-10-18 · "Gallery" premium colour theme

Feedback: the homepage didn't feel premium — the full-bleed **orange (On offer)** and **teal
(Kids)** bands read as "discount store", New arrivals and Staff picks looked identical, and the
Collections link-card strip was clutter.

**Changed:**
- **Removed the Collections link-card strip** from the homepage (and deleted its now-dead component +
  CSS). Budget picks / Accessories are reached via the nav → /shop; the other three collections keep
  their carousel "View all" links.
- **New "Gallery" palette** — warm neutral canvases + one brass-gold accent, saturated colour demoted
  to micro-accents (the discount chip, the eyebrow dot):
  - tokens added: `--rc-bone #f4f0e9`, `--rc-greige #e9e3d7`, `--rc-cream #fbf9f4`.
  - `.rc-section--light` → bone · `.rc-section--paper` → cream · `.rc-section--offer` → **greige**
    (was coral) · `.rc-section--kids` → **cream** (was teal).
- **Section rhythm:** New arrivals (bone) → **Staff picks (dark ink — the premium editorial beat)**
  → On offer (greige) → Kids (cream). All four carousel accents unified to **brass gold** (gold-bright
  on the dark band).

**Files:** `page.tsx` (drop strip), `HomeSections.tsx` (retheme `HomeCarousels`, delete
`CollectionsStrip`/`COLLECTION_LINKS`), `redesign.css` (neutral tokens, section backgrounds, dropped
the dead `.rc-collink` block).

**Verified:** typecheck clean; live browser — strip gone; section backgrounds confirmed bone / ink /
greige / cream; Staff picks renders as a dark editorial band (white names, gold accents); On offer is
a calm greige with red only on the `-15%/-18%/-20%` chips. No console errors.

**Decisions:** Staff picks is **dark** (strongest premium lever) rather than a light greige; the strip
was removed outright rather than kept for Budget/Accessories (nav covers them). Both were the
recommended defaults; easy to flip if wanted.

### Follow-up — "Dusk" palette (same day)

Feedback on the Gallery pass: the all-neutral canvases were **too light and too samey** — the owner
wanted the earlier per-section colour *variation* back, but in **deeper, composed shades** (not the
loud brights, not pale pastels).

Revised to the **"Dusk"** palette — four distinct section identities, all muted and pulled into one
deeper register, alternating warm-light / dark:
- tokens: `--rc-stone #e3d9c7`, `--rc-stone-2 #ece5d7`, `--rc-clay #d8c3b0`, `--rc-petrol #17272c`.
- New arrivals → **warm stone** (light) · Staff picks → **ink** (dark) · On offer → **clay**
  (deeper warm, light) · Kids → **deep petrol** (dark teal). Kids switched to dark-tone cards +
  white text; its blurb joins the light-blurb rule.
- Still one accent (brass gold / gold-bright on darks). Rhythm is light → dark → light → dark, so
  the flow reads composed, not random.

**Verified live:** backgrounds confirmed stone / ink / clay / petrol with correct text contrast;
screenshots show warm-stone New arrivals and a deep-petrol Kids band with the gold line-art cards.
Typecheck clean, no console errors.
