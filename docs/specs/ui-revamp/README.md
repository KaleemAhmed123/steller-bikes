# UI Revamp — video hero + brand palette/fonts

Branch: `frontend/UI-Revamp` · Status: **BUILT (v6) — see build-step-1.md** · Created 2026-10-25
Safety copy of the old 3D site: branch `first-3D-stellar-web` (= `main` @ 2d92af8; one repo, so it covers backend + frontend).

## 1. Task
Replace the 3D-bike homepage hero with a full-bleed looping **video** (desktop file on wide screens,
mobile file on narrow ones). Apply the client's brand tokens (colours + fonts) to the storefront.
Add an admin **Site content** panel so the owner can edit the hero overlay text without a developer.

## 2. Asked for (client PRD + Canva designs, now read)
- Fonts: Heading **Horizon** (logo font) · Subheading **Montserrat Bold** · Body **Montserrat Regular** · Buttons/accents **Montserrat Bold**.
- Colours: Stellar Yellow `#f4a522` · body text `#7f8c8d` (also card shadows) · Energetic Orange `#ff9f00` (card gradients).
- **Added (v3):** the text laid over the hero video ("60,000+ / TRUSTED CUSTOMERS", "Sellers of Various Brands", button label, "STELLAR ORIGINALS / Coming Soon") must be editable from the admin panel — a UI config panel.
- Admin otherwise untouched (the only admin change is this new panel).

### What the two Canva designs show (read via Canva MCP)
**Hero — desktop (design "SHOP BY CATEGORY", page 1; page 2 is blank):** white header (yellow STELLAR logo left; Shop / Saved / Sign in / Cart right). Full-width video, ~16:7, workshop scene, covered bike centre, big "35 YEARS OF MASTERY" centred. Overlays:
- bottom-left: **60,000+** (white) / **TRUSTED CUSTOMERS** (yellow, Horizon-style wide bold) / "Sellers of Various Brands" (white, Montserrat) / pill button **EXPLORE OUR RANGES** (yellow bg, dark text).
- bottom-right: **STELLAR ORIGINALS** (yellow, 2 lines) / "Coming Soon" (white).

**Hero — mobile (design "Trust"):** dark announcement bar ("Diwali Offer Coming Soon" — the existing `announcement` setting) → header (logo + 4 icons) → tall portrait video (~9:16-ish) with "35 YEARS OF MASTERY" → overlays: top-left **60,000+ / TRUSTED CUSTOMERS**; bottom-left **STELLAR ORIGINALS / Coming Soon**; bottom-right "Sellers of Various Brands" + **EXPLORE OUR RANGES** pill.

**Below the hero in the mobile design (not in the PRD text):** black "AUTHORIZED RETAILERS" band (brand logos — placeholder), "SHOP BY CATEGORY" ("current cards are good, keep them"), "DIWALI OFFER" (fireworks, headphones promo), "STELLAR ORIGINALS" block.
**Assumption to confirm:** "35 YEARS OF MASTERY" is baked into the videos (it is not a text layer in Canva). If not, it becomes a Horizon `<h1>` overlay.

## 3. Decisions so far
| # | Decision |
|---|---|
| Safety branch | **Done** — `first-3D-stellar-web` created from `main` (local only, not pushed). |
| Admin | Only the new Site content panel (v3). Nothing else touched. |
| Videos | Use the compressed files: `hero_section_desktop_view_video_compressed.mp4` (2.5 MB), `..mobile..compressed.mp4` (1.4 MB). Originals (5.5/4.1 MB) get deleted so they never ship. |
| Montserrat | Use **`next/font/google`** (already in Next, self-hosts woff2, subsets, no layout shift, zero new dependency). `typeface-montserrat` is deprecated/unmaintained and would add a package for what Next does built-in — **don't install it**. |

## 3b. Answered (v4)
- **Font:** no purchase — use a free Horizon look-alike. Recommendation: **Krona One** (wide, heavy, free on Google Fonts, open licence, loads via `next/font/google` like Montserrat). Backup: **Unbounded** 800. I'll render both next to the Canva screenshot and pick the closer one in step 2.
- **"35 YEARS OF MASTERY"** is baked into the videos → no overlay `<h1>` text for it; a visually-hidden `<h1>` stays for SEO/screen readers.
- **Delete 3D** — yes (stays on `first-3D-stellar-web`). **Remove `HeaderHeroWatch`** — yes. **Below-hero sections** — now in scope (see 4c).
- **Stellar Originals (hero block):** clickable **only** when the admin has saved a link (`promoHref`); text-only otherwise.

## 3c. Answered (v5)
1. **Logo:** replace with `public/logos/LOGO.png` (the mark only); the word **STELLAR** next to it is real text from code (heading font, Stellar Yellow), not part of the image. Used in header + footer.
2. **Retailer logos:** both a pasted link **and** an Upload button, with the accepted format written under the field.
3. **Homepage = exactly:** Hero → Retailers → Categories → Offer rail → Stellar Originals. Nothing else (see 4c-D for what that removes).
4. **Offer rail fully configurable** from admin (title, subtitle, which offer types, on/off) + a firework/sparkle animation.
5. **Offer filter:** multiple offer types at once; products show their offer types in the storefront UI.
6. **Who manages offer types:** approved.

## 3d. Answered (v6)
1. **One set of text** for the hero corner + Stellar Originals section — approved.
2. **Trim `LOGO.png` padding** — approved; keep the artwork sharp and the header size readable (target: mark about 36–40 px tall in the header, trimmed with no resampling blur; original kept as `LOGO.original.png` outside `public/`). Favicon not mentioned → left unchanged.
3. **Cloudinary:** user sets up the account later. I build the Upload button against the existing env names (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`); until set, Upload shows "isn't set up yet — paste a link". Added to the user's to-do list in `playbook.md`.
4. **Offer tags on products:** card = under the image, max 3 + "…"; product page = all, small, under the image (see 4c-B1). Filter any-of — assumed OK (not objected).

## 4. Still open (small)
1. **Product name on the new product-page layout.** You listed the right-hand column as *only* Price, Choose an option, quantity, Add to cart, In stock. A page with no product name looks broken (and loses the `<h1>`). Recommended: keep a slim heading above the price — category (small, grey) + product name + the ♥ save button — and nothing else. Or strictly nothing above the price (name then only in the breadcrumb + a hidden `<h1>`). Which?
2. **The grey note** "Stock and price are tracked per option above. Photos are illustrative sample images." — drop it, or keep it as a small footnote under the Description/Specs section? Recommended: keep as a footnote (the sample-photo disclaimer matters while the catalogue is sample data).

## 4b. Admin-editable hero text (new in v3)
**What exists today:** one `Settings` document in MongoDB (shop info + payment toggles + `announcement` banner), served publicly at `GET /api/settings`, saved at `PATCH /api/admin/settings` behind the `settings.manage` permission. The storefront reads it with `getSettings()` (no-store → edits show on next load). We extend this, not build a second system.

**Editable fields (all from the Canva hero):**
| Field | Default (Canva text) |
|---|---|
| `statValue` | `60,000+` |
| `statLabel` | `TRUSTED CUSTOMERS` |
| `tagline` | `Sellers of Various Brands` |
| `ctaLabel` / `ctaHref` | `EXPLORE OUR RANGES` / `/shop` |
| `promoTitle` | `STELLAR ORIGINALS` |
| `promoSubtitle` | `Coming Soon` |

**Design (lean):**
- **Backend:** one nested `hero` object on the Settings schema; zod rules in `admin.ts` (trimmed, max lengths, `ctaHref` must start with `/` or `https://`). **Defaults live in one place (backend)** so a fresh DB shows the Canva text — the frontend does not duplicate them. Same `settings.manage` permission (no new role/permission = YAGNI). Test added to `adminFlows.test.ts`.
- **Frontend admin:** new page `admin/content` ("Site content") with a small form + live preview strip, added to the admin nav. Reuses the existing `adminApi.settings` calls and form patterns from `admin/settings/page.tsx` — no new fetch code.
- **Storefront:** `HeroVideo` receives `settings.hero` as props and renders it. Empty field → that line is simply hidden (no broken blank pill).
- **Not editable (ceiling, `ponytail:` comment):** the videos themselves and "35 YEARS OF MASTERY" (baked into the video). Swapping a video = replace the file + redeploy. Upgrade path later: image/video upload.
- Fix the existing duplication while here: the settings defaults are copy-pasted in `routes/settings.ts`, `lib/api.ts`, `admin/settings/page.tsx` — derive from one default object instead of adding `hero` a 4th time.

## 4c. New homepage sections + offer types
**One rule:** content lives in the existing Settings doc (hero / retailers / offer rail) or on the product (tags). No new collections. Defaults live in the backend only. Section order and the sections themselves are code; *text, logos, on/off, which offers* are admin.

### A. Authorized Retailers (admin-configurable logo grid)
- Data: `retailers: [{ name, logo, href? }]` on Settings, max 24, array order = display order. `name` + `logo` required; `href` optional (https only).
- Admin (Site content page): repeating rows — add / remove / move up-down. Each row's logo uses the **same image field as the product form** (paste link/path **or** Upload). I'll move that field out of `ProductForm.tsx` into one shared `ImageField` (DRY — no second copy). Helper text under it: *"Paste a link (https://… or /logos/x.png) or click Upload. PNG, SVG or WebP with a transparent background, about 300×150 px, under 500 KB. Link must start with https://."*
- Storefront `RetailerGrid`: black band (per Canva), each logo on a white rounded tile; CSS grid `repeat(auto-fit, minmax(110px, 1fr))` → 3 across on a phone, 5–6 on desktop. `alt` = name, lazy-loaded, falls back to the name text if the image fails. Link only when `href` set. Empty list → section hidden.

### B. Offer types + the configurable Offer rail
- **Product tags:** `offerTypes: [String]` on the product (keys such as `diwali`, `new-year`; lowercase-kebab). Old products ⇒ `[]`, no migration.
- **Master list:** `offerTypes: [String]` on Settings, managed on Platform next to categories (owner: add, delete-blocked-while-in-use, no rename).
- **Tagging:** checkboxes in `ProductForm` (owner + manager); server rejects tags not in the master list.
- **Shown on the storefront:** product card gets small offer pills (e.g. *Diwali*), and the product page lists the offer types the bike is part of. Labels are the key turned into Title Case.
- **Filter:** `GET /api/products?offerType=diwali,new-year` → Mongo `{ offerTypes: { $in: [...] } }` (any-of), zod-validated (max 10 keys). `/shop` `FilterBar` gets an **Offers** chip row with several chips selectable; it reads/writes `?offerType=a,b` like `category` already does, so **refresh/bookmark/share keeps the filters**. Row hidden when no offer is in use.
- **Offer rail = a reusable, admin-controlled component** (no code push for the next sale):
  `offerSection: { enabled, title, subtitle, offerTypes: string[] }` — all four editable in Site content. Off or no matching product ⇒ section not rendered. Uses the existing `RailCarousel` + `ProductCard` (same card style as New Arrivals / Staff Picks); data from the new server filter (`limit=8`); **View all → `/shop?offerType=<the rail's types>`**. Defaults: disabled, title "Diwali Offer", subtitle "Boat Headphones available on selective products" (Canva text) — so launch day = tick Enabled + save.
- **Celebration animation ("cracker blown"):** `FireworkBurst` — **pure CSS, no library**. 3 bursts at different spots on the right of the section, each ~14 tiny sparks in yellow/orange/gold shooting outward on staggered delays, fading and twinkling, then repeating (so it looks like crackers going off now and then). Spark angles/distances come from the index (deterministic → no hydration mismatch). Off for `prefers-reduced-motion`; `aria-hidden`, `pointer-events: none` so it never blocks the cards. `ponytail:` — CSS only; a canvas particle system is the upgrade if more realism is wanted.
- Seed: tag a few **fake** sample products `diwali`.

### B1. Offer tags in the product UI (new in v6)
Both use one small `OfferTags` component (DRY) fed by the product's `offerTypes`; labels = key in Title Case; each pill links to `/shop?offerType=<key>` on the product page (plain text inside the card, because the whole card is already a link — no nested links).
- **Product card** (screenshot 3): a single row **directly under the image**, before the category line. Shows at most **3** pills; if there are more, a 4th muted pill **"…"** whose tooltip/aria-label lists the rest (full list is on the product page). One line only (no wrap, no jumping card heights); none ⇒ no row, no gap.
- **Product page** (screenshot 4): **all** offer types, as small low-contrast pills **directly under the gallery image**, wrapping on narrow screens. Same on mobile and desktop; sizes kept small so they don't compete with the price/Add to cart.
- Data: `offerTypes` is added to the `Product` type and to `CardProduct` / `toCard()` (defaults `[]`).

### C. Stellar Originals (Coming Soon section)
Static section, last on the page. Text = the same `promoTitle` / `promoSubtitle` / `promoHref` used in the hero (see Open Q1): big Stellar-Yellow display title, a "Coming Soon" pill, one Montserrat line, dark workshop-style panel with the brand gradient to echo the hero. Wrapped in a link **only if `promoHref` is set** — otherwise plain text.

### D. Homepage clean-up (consequence of "that's it")
`page.tsx` renders only: `HeroVideo`, `RetailerGrid`, `CategoryExplorer`, `OfferRail`, `OriginalsTeaser`. Removed from the homepage: Brand3D, New Arrivals / Staff Picks / Kids rails, Showroom block (the address/phone stay in the footer). The `/collections/*` pages stay untouched. Components left with no user (`HomeCarousels`, `Showroom`, `EditorialFeature` if unused) are **deleted**, not left dead; `RailCarousel` is kept (the Offer rail uses it).

### F. Product page revamp (new in v6)
**Today** (`app/(shop)/p/[slug]/page.tsx`): right column = category + wishlist, title, **description**, `AddToCart`, a grey note, then the **specs table** — so the buy controls are pushed down by prose.
**Target (per screenshot 4):**
```
┌───────────────────────┬──────────────────────────────┐
│  image gallery        │  [category · name · ♥]  (Q1) │
│  [offer tags, small]  │  ₹24,999.00                  │
│                       │  CHOOSE AN OPTION  [ ][ ][ ] │
│                       │  [ − 1 + ] [ Add to cart ]   │
│                       │  ● In stock                  │
├───────────────────────┴──────────────────────────────┤
│  Description (left)     │   Specs table (right)      │
└──────────────────────────────────────────────────────┘
        More in <category>  (unchanged)
```
- **Top row:** gallery + offer tags on the left; right column holds only what you listed (+ the slim heading if Q1 = yes). `AddToCart` already renders price, options, quantity, button and stock status, so it is **reused as-is** — only its placement changes.
- **Bottom band (new):** a two-column grid — **Description** on the left, **Specifications table** on the right; `grid-template-columns: 1fr 1fr` from ~900 px, stacked (description first, then specs) on phones. A section heading on each ("Description", "Specifications") in the sub-heading style. A band is only rendered if there is a description or specs; if there are no specs the description takes the full width.
- **Files touched:** `p/[slug]/page.tsx` (markup order), `redesign.css` (`.rc-detail*` grid + new `.rc-detail-more`), new `OfferTags.tsx`. No backend change. Semantics kept: one `<h1>`, `<table>` with `<th scope="row">` for specs.
- **Not touched:** gallery/zoom, cart logic, related-products section.

### E. Header/footer logo
`Wordmark` → `<img src="/logos/LOGO.png">` (trimmed) + `<span>STELLAR</span>` in the heading font and Stellar Yellow. The text is a one-line constant in code. Old `/brand/stellar-logo*.png` removed once unused (`stellar-mark.svg` goes with the 3D hero).

### Site content admin page — final shape
Three cards, one **Save** (single `PATCH /api/admin/settings`): *Hero text* · *Offer rail* (enabled, title, subtitle, offer types) · *Authorized retailers*. The offer-type master list is on Platform.

## 5. Plan (ordered; each step builds + lints alone)
1. **Tokens** — one `:root` block in `redesign.css`: `--brand-yellow #f4a522`, `--brand-orange #ff9f00`, `--brand-text #7f8c8d`, `--brand-shadow` (rgba of same grey), `--brand-gradient`. Re-point existing `--rc-hero` / `--rc-body` / `.rc-btn--gold` to them (DRY — no second yellow).
2. **Fonts** — `app/layout.tsx`: drop EB Garamond / Space Grotesk / Inter; add Montserrat (400, 700) + **Krona One** (free Horizon look-alike; Unbounded as backup) both via `next/font/google` — no font files to buy or host. Keep variable names `--font-display` / `--font-body`; add `--font-heading`. Heading = Horizon, sub-heading/buttons = Montserrat 700, body = Montserrat 400.
3. **`HeroVideo.tsx`** (replaces `BikeHero`; text comes from `settings.hero`, step 3b): `<video autoPlay muted loop playsInline preload="metadata" poster>` with two `<source media="(max-width: 767px)">` / default sources → browser downloads only the right file; CSS `object-fit: cover` + aspect ratio per breakpoint (≈16:7 desktop, tall portrait mobile). `prefers-reduced-motion` → poster image only. Overlay copy from Canva as plain server-rendered markup (no JS needed → hero can be a Server Component). Real `<h1>` kept (visually-hidden if the title is in the video).
3b. **Site content config** — backend: `hero`, `retailers`, `offerSection` on Settings + zod + shared defaults + tests; frontend types; admin `Site content` page + nav entry (4b, 4c-A/B). Do this *before* wiring so components never hard-code copy.
3c. **Offer types (backend)** — `offerTypes` on Product + Settings; admin add/delete endpoints; `offerType` query filter + `offerTypes` in the products response; tests (filter, delete-blocked-when-used, tag must exist).
3d. **Offer types (admin UI)** — Platform page list manager; `ProductForm` multi-select.
4. **Poster images** — one still frame per video (junior task; no ffmpeg here — or I take frames in-browser).
5. **Header** — match Canva (white, logo + Shop/Saved/Sign in/Cart); remove `HeaderHeroWatch` if Q5 = yes.
6. **Homepage** — `page.tsx`: `BikeHero` → `HeroVideo`; drop `Brand3D`; fix stale comments.
6b. **Homepage sections** — `RetailerGrid`, `OfferRail` (wraps `RailCarousel`) + `FireworkBurst`, `OriginalsTeaser`; shared admin `ImageField`; `FilterBar` multi offer chips + URL sync; offer pills on `ProductCard` + product page; homepage cut down to the 5 sections (4c-D).
6d. **Product page revamp** — layout per 4c-F + `OfferTags` on the card and the page (4c-B1); check 375 / 768 / 1440 px.
6c. **Logo** — trim `LOGO.png`, rewrite `Wordmark` (mark + coded STELLAR text), remove old brand images.
7. **Cards** — orange gradient + `--brand-shadow` on product/category cards, CSS only; Canva says current card design stays.
8. **Cleanup** — delete `hero/BikeCanvas, Brand3D, LogoCanvas, HeroFallback, paint.ts`, `public/models/cycle.glb`, original videos, dead hero CSS; `npm uninstall three @react-three/* postprocessing @types/three gsap` (grep first that nothing else uses gsap/three — only hero files did). Run `typecheck`, `lint`, `build`.
9. **Verify** — dev server at 375 / 768 / 1440 px, autoplay on a real phone (iOS Safari), Lighthouse check.
10. **Docs** — `build-step-1.md` here, update `playbook.md` if needed, then *ask* before refreshing `storefront-rebuild/context/**` (now stale on 3D).

Principles: KISS (native video + `media` sources, no resize JS), DRY (tokens once), YAGNI (no player lib, no phase-2 sections yet), SRP (HeroVideo only renders the hero).

## 6. Checklist
- [x] Safety branch · [x] Canva read · [x] compressed videos in place
- [x] Open Qs answered (name above price kept; footnote "Stock and price are tracked per option above.")
- [x] tokens · [x] fonts (Montserrat + Krona One) · [x] logo (trimmed, coded STELLAR text)
- [x] HeroVideo · [x] header dark-switch removed · [x] homepage = 5 sections
- [x] site-content config (backend + admin) · [x] offer types (backend, admin, shop filter, tags)
- [x] retailers / offer rail + fireworks / originals · [x] product page revamp
- [x] 3D code + deps removed · [x] typecheck / lint / build · [ ] real-phone autoplay test (owner)
- [ ] Cloudinary keys (owner, later) · [ ] hero poster images (junior)

## Updates log
- 2026-10-25 — plan v1 drafted.
- 2026-10-25 — plan v2: Canva designs read; compressed videos adopted; Montserrat via next/font (not typeface-montserrat); `first-3D-stellar-web` branch created; admin out of scope.
- 2026-10-25 — plan v3: hero overlay text made admin-editable (Site content panel, extends Settings doc + `settings.manage`); admin no longer fully out of scope.
- 2026-10-25 — plan v4: free font (Krona One) instead of Horizon; Canva below-hero sections pulled in scope — admin-configurable Authorized Retailers grid, tag-driven (`offerTypes`) Diwali offer rail switchable from admin, Stellar Originals teaser; `/shop` offer filter synced to the URL; hero Stellar Originals link only when set.
- 2026-10-25 — plan v5: new LOGO.png + coded STELLAR text; retailer logos = link or Upload (shared `ImageField`, format hint shown); homepage cut to Hero → Retailers → Categories → Offer rail → Stellar Originals; Offer rail fully admin-configurable (enable, title, subtitle, offer types) with a CSS firework animation; multi-select offer filter synced to URL; offer pills on products.
- 2026-10-25 — plan v6: offer tags on product card (max 3 + "…", under image) and product page (all, small, under image); product-page revamp (buy panel beside image; description left + specs right below); logo trim approved; Cloudinary deferred (code first, keys later).
- 2026-10-25 — built; see `build-step-1.md`.
- 2026-10-25 — follow-up: Showroom ("Visit · order · ride") restored at the bottom of the homepage; hero now fills the screen width at every size (desktop ~1.9:1, capped to viewport height; phones portrait); seed adds fake demo retailers + switches the offer rail on **only if never configured**.
