# Shop info — map link, contact details and About page

## 1. Task
- **Name:** A "Shop info" sub-page under Admin → Platform (map link, contact, About images), a clickable
  "Open in Maps" Location row, configurable contact details, and a real About page.
- **Status:** Shipped (verified end to end, see section 5)
- **Started / last updated:** 2026-11-01

## 2. What you asked for
- The Location row in "A real shop in Kanpur." opens the map, and looks clickable: no underline, no icon before
  the city/state, just the names and an **Open in Maps** button. Opens the Maps app on Android and iPhone.
- The map link is editable in the admin (Platform).
- Contact name + phone editable in the admin. Defaults: **Saleem**, **+91-8931076870**.
- An About page built from the client's text, **word for word**, with pictures that can be added and updated.
- All of this lives in one dedicated sub-tab under Platform, with **inner tabs** (Location, Contact, About images),
  no live preview. The sub-tab must not make the sidebar highlight two items.

## 3. Decisions
1. **Client text is code, not settings.** `app/(shop)/about/content.ts` holds the About text exactly as supplied.
   Only the pictures are editable in the admin. (Making the words editable later is a larger change.)
2. **Map link.** One setting, `mapLink`. '' = no link (the row becomes plain text). The default is the link the
   owner first supplied, a Google "search viewer" page, which may open in a browser instead of the Maps app. The admin
   tells the owner to paste a Google Maps **Share → Copy link** URL, which opens the Maps app on both platforms.
   We do not detect the phone's OS: a standard Maps link already does the right thing, and an Apple-Maps-specific
   link would need coordinates.
3. **Contact.** `contactName`, `contactPhone` replace the hardcoded "Saleem / +91 80901 09621" in the footer and the
   Location section. The phone is a tap-to-call link.
4. **Pictures.** Five fixed slots (hero, story, matters, brand, guarantee) + a free gallery (max 24, optional
   description for screen readers). A missing picture means the section's text simply uses the full width.
5. **Sidebar.** Only the *most specific* matching item highlights, so "Shop info" lights up and "Platform" does not.
   The sub-item is indented under Platform with a guide line.

## 4. Plan (as built)
**Backend**
- `lib/shopInfo.ts` — defaults, schemas (https-only map link, phone shape, image links), `withShopInfo()`.
- `lib/storeDefaults.ts` — `withStoreDefaults()` applies every defaults-merge in one place; both settings routes use it.
- `models/settings.ts` — `mapLink`, `contactName`, `contactPhone`, `aboutImages`. `routes/admin.ts` — `...shopInfoShape`.
- `tests/shopInfo.test.ts` — defaults, stored-wins, link/phone/image rules.

**Frontend**
- `app/admin/platform/shop-info/` — page with inner tabs; `LocationPanel`, `ContactPanel`, `AboutImagesPanel`;
  shared `useSave` hook + `SaveRow` (button with one status line). Reuses the existing `ImageField` (link or Cloudinary upload).
- `app/admin/AdminShell.tsx` — sub-item support + most-specific-match highlight; `globals.css` `.admin-navsub`.
- `app/(shop)/components/home/Showroom.tsx` — link row + contact; `layout.tsx` footer contact; `lib/contact.ts` `telHref`.
- `app/(shop)/about/` — `content.ts` (client text), `page.tsx` (layout), `about.css`.

The old Settings-tab Phone / WhatsApp fields were removed (nothing read them any more); data already stored under
those names is simply ignored.

## 5. Checklist
- [x] Backend tests (18 across the three settings libs pass); `tsc` clean
- [x] Frontend `tsc` + `eslint` clean
- [x] Browser run (real login): location row is a link with no underline; contact is tap-to-call in showroom + footer;
      sidebar highlights exactly one item on Platform and on Shop info; Save is disabled until a change; a non-https
      map link and a bad phone number are refused with a clear message; saved map link, contact and 7 pictures
      appeared on the shop; About page contains the client sentences; no sideways scroll on a phone; all test
      values restored afterwards.
- [ ] Owner: paste a Google Maps *share* link and test it on a real Android phone and iPhone
- [ ] Owner: upload the real About photos (needs Cloudinary set up, otherwise paste image links)
- [ ] Owner: read the About page against the client's document once more

## 6. Plain-English walkthrough
- **Admin → Platform → Shop info** has three tabs. *Location*: paste the Google Maps link and press Save.
  *Contact*: the name and number shown in the footer and on the home page. *About images*: a picture for each
  section of the About page, plus a photo gallery. Each tab has its own Save.
- On the shop, the Location row now has a gold **Open in Maps** button; tapping the row opens the map (the Maps app
  on a phone). The phone number is tap-to-call.
- The **About us** page shows the client's text exactly, laid out in sections with pictures beside them.

## Updates log
- 2026-11-01 — Built and verified; spec written alongside the code.
- 2026-11-01 — **Photo upload first.** Every About picture (5 section slots + gallery) is now an upload-first control
  (`PhotoField`): preview, Upload/Replace, Remove, the recommended size printed under it, and "Use an image link
  instead" as the fallback. The gallery also has a multi-select **Add photos**. Browser-side checks (JPG/PNG/WebP, under
  5 MB) give plain messages before anything is sent; a photo smaller than the recommended minimum gets a non-blocking
  "may look blurry" note. Sizes: hero 2100 × 800 (21:8, min 1600 × 610), section pictures 1200 × 900 (4:3, min 800 × 600),
  gallery 1000 × 1000 (1:1, min 600 × 600) — they match how the page crops. **Uploads still need the two Cloudinary
  values** (playbook 1b); until set, the Upload buttons are disabled and a notice says so. The upload itself could not
  be exercised here without those keys.
- 2026-11-01 — **Responsive audit.** Shop home, About, Promo strip and all three Shop info tabs checked at 320, 360,
  390, 768, 1024 and 1440 px: no sideways scroll, nothing clipped outside its container, every phone button at least 40px tall.
- 2026-11-01 — **Location row alignment + both payment methods.** The Location link row now fills the whole row, so the
  city/state and the *Open in Maps* button sit at the right edge like every other row (it had shrunk to its content and
  crowded the label). Labels top-align on phones where a value wraps. The Payment row, the footer and the home-page
  blurb no longer say "cash on delivery" only: `lib/payment.ts` words them from the two Platform switches
  (the wording is owned by `paymentLabel`, currently "Pay Your Way · Online or at Delivery" when both are on); the site description names both too.
- 2026-11-01 — **Review clean-up** (see `review-ui-feedbacks.md`). One shared `useSave` hook + `SaveRow` (and one status
  style) now serve the Shop info tabs and the Promo strip page. The five About-picture slots come from one list per package
  (`ABOUT_IMAGE_SLOTS` in the backend; `EMPTY_SETTINGS.aboutImages` + the panel's slot list in the frontend). Gallery rows have
  stable client-side ids. A corrupt stored countdown date falls back to the default instead of failing the endpoint. The crank
  point is shared between the bike drawing and the leg maths. `Showroom` takes `settings` as required. Removed: the Settings
  Phone/WhatsApp fields, `.si-photo` CSS, an invalid `role="grid"`, unused exports. Added: 11 frontend tests (`npm test` in
  `frontend/`) and one backend test. No behaviour change.
- 2026-11-01 — **Second clean-up round** (review items B1-B8). Both image fields (`ImageField`, `PhotoField`) now share one
  upload flow, `useFileUpload`, each keeping its own rules (so product and retailer uploads behave exactly as before). The gallery
  limit is sent by the API as `galleryMax` instead of being typed in the admin. New route-level tests
  (`backend/tests/settingsRoutes.test.ts`, 7 tests): sign-in/role checks, defaults on both routes, saving, refusal of bad input, and
  partial saves leaving other tabs alone. Full backend suite: 148 passing. Left as they were by decision: the `announcement`
  setting names (renaming needs a data migration) and the other constants kept in step by comments.
