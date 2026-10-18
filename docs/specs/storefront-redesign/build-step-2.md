# Build step 2 — Cinematic 3D upgrade + 3D-forward homepage (walkthrough)

**Date:** 2026-10-18 · **Status:** shipped (code + live-verified)

After build step 1, the feedback was: **the 3D needs to be more ambitious and creative, add
more 3D, and trim other features to make room.** This step does that.

---

## 1. What changed

- **Hero is now a cinematic 3D sequence, not a single rotating model:**
  - **Studio reflections** — an in-code lighting environment (drei `<Lightformer>`s; **no network
    downloads**) so the bike's frame genuinely reflects light.
  - **A wet-asphalt reflective floor** (`MeshReflectorMaterial`) the bike mirrors into.
  - **Post-processing** (`@react-three/postprocessing`): **Bloom** (the gold/blue rim light glows)
    + **Vignette** for a graded, cinematic frame.
  - **A multi-beat scroll sequence** — the camera moves through four framed "shots" (front 3/4 →
    side profile → dramatic rear 3/4 → settle) as you scroll, and the headline **crossfades**
    through three beats: "RIDE / YOUR CITY" → "BUILT FOR / EVERY STREET" → "AFFORDABLE / & HONEST".
    The eyebrow, lede and primary CTA stay **persistent** so the action is always reachable.
- **A second 3D moment** lower on the page — a brand "turntable": the same bike slowly rotating on
  a dark stage next to a brand statement + CTA. It only mounts while near the viewport.
- **The homepage was trimmed to be 3D-forward.** It is now: hero → category explorer → second 3D
  moment → collections strip → showroom. The product **rails moved to dedicated pages.**
- **New dedicated collection pages** at `/collections/new-arrivals`, `/staff-picks`, `/budget`,
  `/offers` — each a full landing page built from the same honest, real-data derivations. Kids and
  Accessories keep their category pages (`/shop?category=…`). A **collections strip** on the
  homepage links to all of them.
- **Performance guard:** the hero's render loop **pauses** (`frameloop="never"`) when the hero is
  scrolled off-screen, so the heavy post-processed scene isn't burning GPU in the background.

## 2. Why it was needed

The first 3D pass was technically correct but visually flat — one model, one rotation. The brand's
"wow" moment needs to feel art-directed. Reflections + bloom + a reflective floor + a choreographed
camera turn a static model into a cinematic sequence; a second 3D beat threads the theme through the
page; and trimming the homepage (moving rails to their own pages) keeps the 3D the star without
losing any shopping path.

## 3. How it works, step by step

1. **`BikeCanvas`** builds the scene: the model under an in-code `<Environment>` (Lightformers) for
   reflections, a `MeshReflectorMaterial` floor, explicit gold/blue lights, and an `<EffectComposer>`
   with Bloom + Vignette. A **`CameraRig`** reads the shared scroll `progress` (0→1), interpolates
   the camera position/target along four keyframed shots with smoothstep easing, and damps the
   camera toward it each frame (frame-rate-independent).
2. **`BikeHero`** pins the section with GSAP ScrollTrigger over a longer scroll (`+=220%`), writes
   `progress`, and runs a second scrubbed timeline that crossfades the three stacked headline beats.
   An IntersectionObserver toggles `active`, which flips the canvas `frameloop` to pause rendering
   off-screen. Desktop + motion only; mobile/reduced-motion gets a static first beat and a lighter
   (no-post, no-reflector) scene.
3. **`Brand3D` / `BrandCanvas`** render the turntable bike; the canvas is mounted only while the
   section is within 200px of the viewport, so two heavy contexts don't run at once.
4. **Homepage** calls `loadHomeData` only for the category tiles now; everything else is the two 3D
   moments + the collections strip (static links) + showroom.
5. **Collection pages** call `loadCollection(slug)`, which re-derives the full list for that
   collection from real fields (newest / curated / cheapest / genuinely-discounted) and renders a
   header + card grid.

## 4. Files / functions changed

**New:**
- `app/(shop)/components/hero/BrandCanvas.tsx` — the turntable R3F scene (reuses the preloaded model).
- `app/(shop)/components/hero/Brand3D.tsx` — mounts the turntable on visibility; the brand band + copy.
- `app/(shop)/collections/[slug]/page.tsx` — dedicated collection landing pages.
- `CollectionsStrip` (in `components/home/HomeSections.tsx`) — homepage links to the collections.
- `lib/catalogue.ts` — `COLLECTIONS`, `CollectionSlug`, `CollectionData`, `loadCollection`.

**Rewritten:**
- `app/(shop)/components/hero/BikeCanvas.tsx` — Environment + reflective floor + post + `CameraRig` + `frameloop` pause.
- `app/(shop)/components/hero/BikeHero.tsx` — multi-beat crossfade, longer pin, persistent CTA, off-screen pause.
- `app/(shop)/page.tsx` — trimmed, 3D-forward homepage.
- `app/redesign.css` — restructured hero layout (stacked beat grid, persistent eyebrow/copy) + Brand3D + collections-strip styles.

**Dependencies added:** `@react-three/postprocessing`, `postprocessing` (lazy-loaded with the 3D chunk).

## 5. Important decisions

- **Kept the current single-mesh model, enhanced the presentation.** The model is one fused mesh, so
  wheel-spin / exploded-view beats aren't possible without a different asset; rather than risk
  sourcing a licence-clean multi-part model, the camera choreography + reflections + bloom + floor
  deliver the cinematic quality.
- **In-code studio environment (Lightformers), not an HDRI download** — real reflections with zero
  network dependency, so it can't fail to load.
- **Pause rendering off-screen + mount the second canvas on visibility** — keeps two post-processed
  scenes from taxing the GPU at once.
- **Moved rails to dedicated pages rather than deleting them** — the homepage gets leaner and
  3D-forward, but every collection is still a real, linkable page; nothing was lost.

## 6. Tests / verification (actually run)

- **Frontend typecheck** (`tsc --noEmit`): clean. **Production build** (`next build`): clean — 19
  routes; homepage first-load JS **113 kB** (Three.js + GSAP + postprocessing all code-split).
- **Browser (Chrome, live on Atlas):** hero renders the cinematic scene (reflections, bloom,
  reflective floor); scrolling drives the **camera through its shots** and the **headline crossfade**
  (verified "BUILT FOR / EVERY STREET" mid-sequence with the camera on the side profile); the second
  3D turntable renders; the collections strip and the `/collections/offers` page render with real
  discounted products. No console errors (only the expected guest 401 + harmless THREE deprecation
  warnings).

## 7. Edge cases and limitations

- **Single-mesh model** → no per-part animation (no spinning wheels / exploded view). Documented;
  needs a multi-part model to change.
- **Two WebGL canvases** — mitigated (hero pauses off-screen; brand canvas mounts on visibility), but
  on a very weak GPU the post-processed hero is still the heaviest thing on the page. Mobile/
  reduced-motion already drop the post + reflector.
- **Model still ~2.4 MB, un-compressed** (unchanged) — lazy-loaded; a Draco/texture pass is still the
  main future optimisation.
- The homepage no longer shows product cards directly; shopping is one tap away via the category
  tiles, the collections strip, or the nav. This was the explicit "make 3D the star" trade-off.
