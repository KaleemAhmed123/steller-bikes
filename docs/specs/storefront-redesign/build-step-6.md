# Build step 6 — Editorial revamp, Phase 1 (design tokens + card + detail)

**Date:** 2026-10-18 · **Status:** Phase 1 built (typecheck clean, live-verified in browser;
`next build` pending a dev-server stop)

The owner adopted an **"extract a design system from a reference brand, then apply it"** workflow and
picked **`DESIGN-elevenlabs.md`** (an editorial off-white system) as the reference, saying the current
**product card and detail page looked cheap** and wanting **bigger, broader components** with a
premium first impression.

## Decisions settled before building (do not re-litigate)
- **Direction = Hybrid.** Apply the ElevenLabs editorial system across the storefront, but **keep the
  dark 3D bike hero** as the one brand moment (ElevenLabs itself allows a rare dark hero).
- **Reference = ElevenLabs DNA + Rapha/Aesop shop patterns.** ElevenLabs is a *marketing-site* system
  with no real e-commerce components, so the shop-specific parts (card, variant picker, PDP, grid)
  follow premium-retail patterns from Rapha + Aesop.
- **Type = EB Garamond (light serif) + Inter body.** The thin serif is the premium signal. Space
  Grotesk is kept ONLY for the cinematic hero headline so it doesn't go serif.
- **Colour = go editorial.** Off-white canvas, warm near-black ink, **ink-pill CTAs**, no saturated
  accent. This **retires the gold accent and the "Fresh" pastel section bands** from build step 3's
  follow-up. Pastel returns later only as atmospheric orbs (Phase 2).
- **Scope = Phase 1 only:** design-token layer + ProductCard + product detail + buttons. Homepage
  section *backgrounds* were also flipped to off-white (cheap to do) so the page isn't half-pastel.

## 1. What changed
- **Editorial token layer** in `redesign.css` `:root`: canvas `#f5f5f5`, soft `#fafafa`, card `#fff`,
  ink `#0c0a09`, body `#4e4e4e`, muted `#777169`, hairlines `#e7e5e4/#d6d3d1`, five pastel-orb colours
  (atmosphere, Phase 2), and `--rc-accent` repointed to **ink**. Base tokens `--background` and
  `--muted-foreground` overridden so legacy surfaces inherit the canvas.
- **Fonts:** added **EB Garamond** (`--font-display`), kept **Inter** body, added **Space Grotesk**
  as `--font-hero` and pinned the hero headline to it.
- **Buttons:** lighter weight (500, was 700), pill; added an **outline** secondary. The editorial
  primary is the existing **ink pill** (`rc-btn--ink`). Gold pill kept only for the dark hero.
- **ProductCard (Rapha/Aesop):** bigger **square** media with a hairline border; **serif product
  names** (21px/500); category in uppercase caption; price refined (17px/600); the loud red discount
  chip became a **quiet white hairline badge**; "Choose options" is now an **ink underline**; add
  button is an ink pill. Grid went **4-up → 3-up** (both the catalogue grid and the homepage
  carousels).
- **Product detail (Rapha/Aesop PDP):** **serif title** (up to 68px/500), editorial body copy, more
  gutter (60px), ink crumb hover. The variant pills + ink "Add to cart" + sticky gallery + hairline
  spec rows already existed and now sit in the editorial frame.
- **Homepage:** the four carousel bands flipped from pastel to a subtle **canvas / canvas-soft**
  alternation; carousel + category-tile accents moved from gold/rainbow to **ink**. The 3D hero and
  turntable are untouched and still render.

## 2. Why it was needed
The old card/detail read as a catalogue flyer: small dense cards, bold sans, loud saturated bands and
a red discount chip. Premium retail does the opposite — off-white canvas, a light serif, big calm
imagery, one restrained ink action. Adopting that system (with real shop patterns for the parts
ElevenLabs doesn't cover) is what turns "cheap" into "boutique".

## 3. How it works, step by step
1. `app/layout.tsx` loads EB Garamond → `--font-display`, Inter → `--font-body`, Space Grotesk →
   `--font-hero`, and exposes all three CSS variables on `<html>`.
2. `redesign.css` `:root` defines the editorial palette and overrides `--background` /
   `--muted-foreground`, so every surface (including legacy pages) sits on the off-white canvas.
3. Display headings (`rc-sec-title`, `rc-detail-title`, `rc-card-name`, wordmark, category tiles)
   use `--font-display` at weight 400/500 — the serif only ships those weights, so the old 700 rules
   were dropped to avoid faux-bold.
4. The ProductCard and detail styles were restyled in place (no markup change needed): the offer chip,
   card name, price, CTA, grid columns, and PDP typography all moved to the editorial tokens.
5. `HomeSections.tsx` now passes an **ink** accent to the carousels and category tiles, and the
   `rc-section--*` band classes resolve to off-white.

## 4. Files / functions changed
- `app/layout.tsx` — fonts (EB Garamond + Space Grotesk hero var).
- `app/redesign.css` — `:root` editorial tokens; buttons; section bands; display-heading weights;
  ProductCard (media/name/price/chip/CTA); 3-up grid + carousel; product-detail typography; neutralised
  nav/wordmark gold.
- `app/(shop)/components/home/HomeSections.tsx` — carousel + category accents → ink.

## 5. Important decisions
- **EB Garamond at 400/500, not 700.** The brand signal is a *light* serif; bold serif would read
  consumer-marketing, the opposite of editorial. Old 700 display rules were lowered to 500.
- **Hero kept on Space Grotesk.** A thin serif on the dark cinematic hero would look weak; the hero
  headline stays bold grotesk via `--font-hero`.
- **Discount shown as a quiet badge, not a red chip.** Honesty preserved (still shows `-15%` and the
  struck price), but restrained — the editorial system has no saturated colour.
- **Flipped the homepage bands now.** Out of strict Phase 1 scope, but cheap, and it avoids a
  half-pastel / half-editorial page while Phase 2 is pending.

## 6. Tests / verification (actually run)
- **Typecheck** (`tsc --noEmit`): clean.
- **Live browser (Chrome, dev server on Atlas data):**
  - `/shop`: off-white canvas, **3-up bigger cards**, serif product names, quiet hairline discount
    badge, ink "Choose options".
  - `/p/trail-29`: serif title, sticky gallery, ink variant pills, ink "Add to cart", hairline specs.
  - `/` homepage: carousel bands resolve to `#f5f5f5` / `#fafafa` (confirmed by computed style), serif
    section heads, ink accents; the **3D hero canvas still mounts**.
  - No console errors (only the expected guest 401).
- **`next build`: not yet run** (must stop the dev server first — running a build over the live `.next`
  corrupts dev chunks; learned in build step 3).

## 7. Edge cases and limitations
- **Phase 2 still carries gold / non-editorial bits:** the dark hero's gold CTA + eyebrow (intended),
  the footer's gold headings, the logo mark's gold bike stroke, and the shop **filter** chips/focus
  outlines. These are deliberately left for Phase 2 (nav, footer, forms, shop filters, homepage orbs).
- **No gradient orbs yet** — the atmospheric pastel orbs (the system's only colour moment) arrive with
  the Phase 2 homepage/section redesign.
- **Serif legibility:** product names at 21px EB Garamond are fine; if any name wraps awkwardly on
  mobile, it can be nudged down a step.
- **`next build` unverified** this pass (see §6).

---

## Update — Phase 2 + carousel fixes (same day)

**Carousel fixes (requested):**
- **Hid the native scrollbar** on the carousel track and the rail (`scrollbar-width: none` +
  `::-webkit-scrollbar { display:none }`) — the arrows + dots drive it now.
- **Centred the arrows on the card image** (not the whole card): `RailCarousel.measure()` reads the
  first `.rc-card-media` height and sets `--rc-arrow-top` on the viewport; the arrows use that. Made
  them clearly highlighted (46px, solid white, hairline border, stronger shadow) and moved just
  inside the image edges.

**Phase 2 — roll the editorial system across the rest of the chrome:**
- **Logo** → monochrome (white bike inside the ink ring; gold stroke removed). **Nav badge** →
  ink pill with white text (was gold).
- **Footer** → light editorial: `canvas-soft` background, 1px hairline top, body-grey links, muted
  uppercase headings, ink wordmark (was a dark footer with gold headings).
- **Shop filters** → editorial ink: active chip text, focus outlines, and link buttons moved off gold.
- **Showroom + 2nd 3D moment** → kept as dark anchor bands but **retired their gold/blue**: white
  eyebrow dot + a new **`rc-btn--light`** (white pill, ink text) in place of the gold pill.
- **Gradient orbs (the ElevenLabs signature)** → added as pure atmosphere: `.rc-section::before` is a
  soft, blurred radial bloom driven by a per-section `--rc-orb` (lavender on the category explorer,
  mint/lavender/peach/sky on the four carousels; unset = invisible, so dark sections have none). The
  section content sits above via `.rc-section > .container { z-index: 1 }`.

**Still gold (deliberate):** only the **dark 3D hero** (its gold rim-light + CTA read as cinematic,
not UI chrome). Flagged; can be neutralised to white on request.

**Verified live:** category explorer shows the lavender orb; footer renders light editorial with the
monochrome logo; Showroom is a dark band with a white pill and no gold. Typecheck clean; no console
errors (expected guest 401 + harmless Three warnings only). `next build` still pending a dev stop.

### Update — hero accent: gold → dark navy + neon blue (same day)

The owner asked to retire the hero's gold, but **with a catchy colour, not silver/white**. Iterated:
aqua-mint `#2fe0c0` (rejected — "too green") → periwinkle-violet `#8b7bff` → **final: dark navy hero
with a neon electric-blue glow.**
- Tokens **`--rc-hero: #3d82ff`** + **`--rc-hero-soft: #6da3ff`** (CTA pill text `#06143a`). Drive the
  hero eyebrow, the "YOUR CITY" text-stroke, the scroll pulse, and the hero CTA pill (`rc-btn--gold`,
  now hero-only). Old `--rc-gold`/`--rc-gold-bright` tokens removed (all refs repointed).
- **Hero made dark navy:** `.rc-hero` background `#080b14`; `.rc-hero-backdrop` radial retinted to navy
  (`#1b2747 → #0f1628 → #080b14`) + its dark overlay rgba shifted blue.
- **3D scene rim light** → neon blue **`#6aa8ff`** in **BikeCanvas** + **BrandCanvas** (the
  `<Lightformer>` key and the `<directionalLight>`); the existing blue fill stays, so the bike glows
  electric blue over the navy.
- **Neon tuning tried, then reverted** (owner asked for more neon, then "revert to earlier"): a brighter
  blue bloom + extra strip lightformers + a CSS text/CTA glow were added and then **reverted** back to
  the calmer navy-blue. Current state = navy hero + electric-blue `#3d82ff` accent + `#6aa8ff` rim light +
  default Bloom (`intensity 0.9 / threshold 0.55`); no text-shadow / box-shadow glow on the hero.
- Also **lightened the dark content band**: `.rc-section--dark` `#0c0a09` → **`#201d1c`** (warm charcoal)
  so the Showroom/2nd-3D bands aren't near-black.

**Verified live:** hero is deep navy with a neon electric-blue eyebrow + "YOUR CITY" outline + CTA pill
and a blue-glowing bike; Showroom band is the lighter charcoal. 3D canvas mounts; typecheck clean. **No
gold remains anywhere.**

### Phase status
- **Phase 1 + Phase 2 complete and live-verified.** The storefront is one editorial system end to end.
- **Not yet done:** `next build` (needs dev stop), and **no commits exist yet** (import + editorial
  commit batch still pending). Phase 3 ideas below.
