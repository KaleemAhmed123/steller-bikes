# Build step 9 — Hero 3D model swap (red cycle) + shorter scroll

**Status:** shipped · **Started:** 2026-10-19 · **Last updated:** 2026-10-19

## 1. What you asked for

- Replace the hero 3D bike with a new model (`untitled.glb`).
- Compress it hard, **without losing quality** (no visible detail loss).
- **Keep the real lighting** — studio lights, reflections, bloom.
- **Shorten the scroll** so the 3D scene is seen in less scrolling; the category
  section below should be reachable faster.
- Make it **obvious the hero is interactive** (text/cue should signal "scroll me").
- On colour: keep the bike **red**, warm the lights so red reads true. No texture
  recolour — brand theme would look odd. Revertible if it looks off.

## 2. Open questions (answered)

- **Bike colour?** → *Keep red, warm the lights.* (Texture recolour rejected — the
  red is a baked image; tinting to gold/mint would look muddy and fight the theme.)
- **How much shorter scroll?** → *110%* (was 165%).

## 3. Plan / approach

- Compress with `gltf-transform optimize --compress meshopt --texture-compress webp
  --simplify false`. Meshopt + WebP = ~80% smaller, **no polygon loss**. Meshopt's
  decoder ships inside `drei` → **no extra network download** (keeps the existing
  "zero downloads" setup).
- Swap the model path; the whole scene (lights, floor, bloom, shadows) is in code,
  so it survives the swap untouched.
- Warm the two key lights; keep one cool blue rim/fill for cinematic depth.
- Guard the exporter's `doubleSided` flag so no panels vanish.
- Drop the pin length 165% → 110% (two matching spots).
- Strengthen the scroll cue (label + bouncing down-chevron).

**Rejected:** polygon simplification (risked quality), Draco compression (needs a
CDN decoder download — Meshopt is bundled), texture recolour (muddy + off-theme).

## 4. Tasks

- [x] Compress `untitled.glb` → `cycle.glb` (5.8 MB → 1.2 MB)
- [x] Point the hero at the new model
- [x] Warm the lights; keep blue rim
- [x] Preserve double-sided faces in the paint shader
- [x] Scroll 165% → 110%
- [x] Clearer interactive scroll cue
- [x] Verify in the browser (render + scroll)

## 5. Updates

- **2026-10-19** — Shipped. Kept the old `bicycle.glb` in place for a one-line
  revert while the red look is being judged.
- **2026-10-19 (2)** — Follow-up after review. Three things:
  - **Lag fixed.** The new model was **149,560 triangles** vs the old bike's
    **1,712** — ~87× heavier. The hero renders the scene twice per frame (reflective
    floor) + bloom, so that was the lag. **Simplified to ~60k triangles** (ratio 0.4,
    low error) + texture to 1024px. Still 2.5× lighter than the raw model; wheels stay
    round (33k was tried first but faceted the tyres, which dominate the hero).
  - **Colour → golden theme.** Red-on-blue looked off. Chose to recolour the *scene*
    gold (not the bike): flipped `--rc-hero`/`--rc-hero-soft` to brand amber-gold
    (`#f2a52e`/`#f8bf63`), warmed the backdrop gradient and the 3D studio lights to
    amber. Red bike now reads as a rich warm red. One token change drives the eyebrow,
    headline accent, scroll cue **and** the CTA button together.
  - **Real logo.** The wordmark already used the real artwork but in blue. Recoloured
    it to brand gold with `sharp` (flat fill masked by the PNG's alpha) →
    `stellar-logo-gold.png`; pointed `Wordmark` at it. Blue `stellar-logo.png` kept for
    revert.
- **2026-10-19 (3)** — Navbar + a build-cache fix.
  - **Navbar links.** They were dark (ink) on the light bar even over the dark hero.
    Now: **white links on a soft dark scrim while the hero sits under the header**, and
    the **solid light bar with dark links** once scrolled past it (and on every page
    with no hero, e.g. cart/shop). Driven by a tiny client watcher `HeaderHeroWatch`
    that toggles `body[data-over-hero]` via an IntersectionObserver on `.rc-hero`
    (re-checks on route change). `AccountNav` got the `rc-nav-link` class it was missing
    so "Sign in"/"Account" flips too; `.cart-button` added to the white rule.
  - **Build error (`ENOENT … _document.js`).** Self-inflicted: I was running a **second**
    `next dev` on :3001 while the owner's server ran on :3000 — two dev processes sharing
    one `.next` corrupt it. Fix: kill all dev servers, `rm -rf frontend/.next`, start
    **one**. **Rule going forward: only ever one `npm run dev` per project dir.**
- **2026-10-19 (4)** — Hero polish + second 3D element recoloured.
  - **Headline/eyebrow spacing.** Eyebrow nudged down (`top` clamp raised), headline
    raised (`bottom` clamp raised) to tighten the gap.
  - **Top white band removed.** The sticky header reserved ~70px at the top; the hero
    started below it, so the header's semi-transparent scrim sat over the light-grey
    `body` → a pale band. Fix: `--rc-header-h` var + `.rc-hero { margin-top: calc(-1 *
    var(--rc-header-h)) }` pulls the hero full-bleed under the transparent header (and
    everything below shifts up). Hero base colour also changed navy → warm-dark.
  - **"Stellar Look" 3D emblem → gold.** The extruded brand mark in `LogoCanvas` was
    electric blue; recoloured material + emissive + lights to brand gold, and the
    `Brand3D` fallback tint too.

## 7. Explanation (walkthrough)

### What changed
The hero now shows a **red cycle** instead of the old bike. The new model is
compressed from **5.8 MB to 1.2 MB** with no visible quality loss. The studio
lights are **warmed** so the red looks true (not muddy under the old blue light),
while one **blue rim light** stays for a cinematic edge. The scroll that drives the
3D camera is **shorter** (110% of a screen instead of 165%), and the bottom cue now
reads **"Scroll to explore"** with a bouncing **down-chevron** so visitors know the
hero reacts to scrolling.

### Why it was needed
The old bike was being replaced. A raw 5.8 MB model is too heavy for a first-paint
hero. The long 165% pin meant too much scrolling before the category section showed,
and some visitors didn't realise the hero was interactive.

### How it works, step by step
1. **Compression** — `gltf-transform optimize` runs two savings:
   **Meshopt** (shrinks the 3D mesh data, lossless to the eye) and **WebP** (smaller
   texture image). Polygon simplification is **off**, so the shape is untouched.
2. **Loading** — `useGLTF` in `BikeCanvas.tsx` loads `/models/cycle.glb`. Meshopt's
   decoder is already bundled in `drei`, so nothing extra downloads at runtime.
3. **Material** — every mesh's baked material is upgraded by `upgradePaint` into a
   glossy clearcoat paint (`MeshPhysicalMaterial`). It now also copies the face
   **sidedness**, so the model's double-sided panels don't turn into holes.
4. **Lighting** — all lights live in code. The two key lights are now warm-white so
   red reads true; a blue rim light and the dark navy backdrop keep the mood.
5. **Scroll** — a GSAP ScrollTrigger pins the hero for **110%** of a screen and feeds
   a 0→1 `progress` value to the camera, which eases through four framed shots. The
   same scroll crossfades the three headlines. The bottom cue bobs + shows a chevron.

### Files / functions changed
- **`frontend/public/models/cycle.glb`** (new) — the compressed red bike (1.2 MB).
  `bicycle.glb` kept for a quick revert.
- **`BikeCanvas.tsx`** — `MODEL` points to `cycle.glb`; key `Lightformer` +
  `directionalLight` colours warmed (`#fff1e0` / `#fff2e8`), one blue fill kept.
- **`paint.ts`** — `upgradePaint` now copies `std.side` (no missing faces).
- **`BikeHero.tsx`** — pin + headline timeline `end` 165% → 110%; cue label
  "Scroll" → "Scroll to explore"; stale "2.3 MB" comment fixed.
- **`redesign.css`** — `.rc-hero-scroll` brighter + bobbing; added a CSS down-chevron.

### Important decisions
- **Meshopt over Draco** — Draco squeezes slightly smaller but needs a decoder
  downloaded from a CDN; Meshopt is bundled in `drei`, so zero network cost.
- **No simplification** — honours "don't lose quality"; 149k triangles is a fine
  hero weight.
- **Warm lights, not recolour** — the red is a baked texture; tinting it would be
  muddy and clash with the theme. Warming the light is the clean, revertible fix.

### Tests / verification
- `gltf-transform` reported `untitled.glb (6.07 MB) → bike-opt.glb (1.22 MB)`.
- Ran the Next dev server and loaded the hero in a real browser:
  - Red bike renders fully — frame, forks, wheels, saddle, disc brakes — **no missing
    faces**, red reads true, blue rim present.
  - Only console errors are the backend API (`localhost:8000`) not running — expected;
    **no model/Meshopt/WebGL errors**.
  - Scrolling moved the camera to the side-profile shot and crossfaded the headline to
    "BUILT FOR / EVERY STREET"; the scroll cue showed the chevron.

### Edge cases and limitations
- The bike's default **orientation/rotation** (`rotation={[0.05, -0.5, 0]}`) and
  auto-scale were tuned for the old model; they look right for this one, but if a
  future model sits oddly, that rotation is the knob.
- The old `bicycle.glb` is still shipped; delete it once the red look is approved.
- Backend wasn't running during the check, so cart/account calls failed — unrelated
  to the hero.
