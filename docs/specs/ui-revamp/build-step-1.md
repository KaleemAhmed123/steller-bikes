# Build step 1 — what was built (2026-10-25)

Branch `frontend/UI-Revamp`. The old 3D site is safe on `first-3D-stellar-web`.

## In plain words
- **Hero** is now a looping video. Phones download only the portrait video, everything else the
  landscape one (`<source media>`), and CSS scales it. The text over it is real text from the admin.
- **Homepage** = Hero → Authorized retailers → Shop by category → Offer rail → Stellar Originals → Showroom ("Visit · order · ride", restored in a follow-up).
- **Admin → Site content** edits the hero text, the offer rail and the retailer logos.
- **Offer types** (Diwali, New Year…) tag products, filter `/shop` (several at once, kept in the URL)
  and drive the homepage rail. The rail is switched on/off and re-pointed in admin — no code push.
- **Product page**: buy panel beside the photo; description left + specs right underneath.
- **Brand**: Stellar Yellow `#f4a522`, faint-black `#7f8c8d`, Orange `#ff9f00` as CSS variables;
  Montserrat (body/sub-headings/buttons) + Krona One (free look-alike for the paid Horizon font).

## Files (where to look)
| Thing | Where |
|---|---|
| Brand tokens, hero/offer/retailer/originals CSS | `frontend/app/redesign.css` |
| Fonts | `frontend/app/layout.tsx` |
| Hero | `app/(shop)/components/hero/HeroVideo.tsx`, `HeroBackdropVideo.tsx` |
| Home sections | `app/(shop)/components/home/` (`RetailerGrid`, `OfferRail`, `FireworkBurst`, `OriginalsTeaser`) |
| Offer pills | `app/(shop)/components/OfferTags.tsx`, `lib/offers.ts` |
| Admin Site content / Platform offer types / product tagging | `app/admin/content/page.tsx`, `platform/page.tsx`, `components/ProductForm.tsx`, `components/ImageField.tsx` |
| Content rules + the Canva defaults (one place) | `backend/src/lib/siteContent.ts` |
| Offer-type endpoints, tag validation | `backend/src/routes/admin.ts` |
| `?offerType=` filter | `backend/src/lib/productQuery.ts`, `routes/products.ts` |

## Removed
three.js / react-three / postprocessing / gsap (7 packages), `BikeHero`, `BikeCanvas`, `Brand3D`,
`LogoCanvas`, `HeroFallback`, `paint.ts`, `HeaderHeroWatch`, `public/models/cycle.glb`, the old
`/brand/*` logos and `images/hero.jpg`, the uncompressed hero videos, and the homepage New
Arrivals / Staff Picks / Kids rails (`/collections/*` pages unchanged).

## Verified
Backend typecheck + new unit tests (`siteContent`, `productQuery` offerType). Frontend typecheck, lint
and `next build` clean. Viewed in headless Chrome at 1440 px and 390 px (home, product, shop filter)
against the seeded sample catalogue. Admin endpoints exercised over HTTP (bad link → 400, delete of an
in-use offer type → 409, save → 200).

## Ceilings (`ponytail`)
- Fireworks are CSS sparks; a canvas particle system is the upgrade.
- Retailer logos: link or Cloudinary upload (needs your keys); no server-side upload.
- Hero videos are files in `public/`; swapping one = replace file + redeploy.
- Offer types have no rename (delete + re-tag).

## You still need to
1. Create the Cloudinary account and add the two env values (playbook §1b).
2. Test hero autoplay on a real iPhone + Android.
3. Take a still frame of each video for a poster image (optional, junior task).
4. Add retailer logos, tag the real Diwali products, switch the offer rail on.
