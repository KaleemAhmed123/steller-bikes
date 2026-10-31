# Promo strip — animated, selectable banner above the navbar

## 1. Task
- **Name:** Admin "Promo strip" tab: pick one of 9 animated looks for the bar above the shop's navbar, edit its text, apply.
- **Status:** Shipped (verified end to end, see section 5)
- **Started / last updated:** 2026-11-01

## 2. What you asked for
- The old announcement bar looked plain. Replace it with creative, festival-ready strips (Diwali first, then
  New Year, Christmas…) that match the bicycle shop's look.
- A **separate tab under Platform**: select a design, update the text, apply, and the style goes live.
- Built to clean-code principles (DRY, SOLID, YAGNI, Pragmatic Programmer).
- The nine looks were designed and approved as artifacts ("Festival Ride Strips"): Diwali Ride, Diwali Night,
  Christmas Ride, New Year Countdown, Holi Splash, Eid Lantern Ride, Tiranga Ride, Wheelie Sale, Everyday Ride.

## 3. Open questions (decided, unless you say otherwise)
1. **Where does the text live?** → Reuse the existing `announcement` setting. One source of truth; no migration;
   the text already on the shop keeps showing. The Platform tab's banner box was removed so the text has one home.
2. **How is the look stored?** → One new string, `announcementStyle`, on the settings document.
3. **Who owns the list of looks?** → The frontend (it draws them). The server checks only the key's *shape*
   (lowercase words and hyphens) and the frontend falls back to Everyday for a key it doesn't know. This avoids
   keeping the same list in two places. Trade-off: the API would accept a well-formed but unknown key; the shop
   shows the default look for it, nothing breaks.
4. **Colour chooser per festival?** → No (YAGNI). Each look has its own fixed palette.
5. **New Year end date?** → First shipped automatic; now configurable (see Updates log). Default = next 1 January IST.
6. **Text length?** → The input stops at 120 characters (short reads best on a strip); the server still allows 300
   so older, longer text stays valid.

## 4. Plan (as built)
**Backend** (`backend/`)
- `src/lib/promoStrip.ts` — `DEFAULT_STRIP_STYLE` ('everyday'), `stripStyleSchema`, `withPromoStrip()` (merges the
  default on read, same pattern as `siteContent.ts`).
- `src/models/settings.ts` — `announcementStyle` (no schema default; the default lives in the lib).
- `src/routes/settings.ts` (public GET) and `src/routes/admin.ts` (GET/PATCH) — return the merged value; admin PATCH
  accepts `announcementStyle`. The two copies of the admin response were folded into one `settingsView()` helper.
- `tests/promoStrip.test.ts` — default, stored value wins, key shape.

**Frontend** (`frontend/`)
- `components/promo-strip/` — the feature, one responsibility per file:
  - `strips.tsx` — the **single catalogue** (id, name, description, sample text, scene). Adding a festival = one
    scene + one row + one CSS block (open for extension, closed for modification).
  - `Bike.tsx` (client) — the pedalling cyclist; festival kit comes in through slots (`behind`, `head`, `front`),
    built in `accessories.tsx`. `pedal.ts` is the pure leg geometry.
  - `parts.tsx` — shared scenery (lights, fireworks, stars, trails…). `Countdown.tsx` (client) — the flip clock.
  - `random.ts` — seeded randomness so the server and browser draw identical strips (no hydration mismatch).
  - `PromoStrip.tsx` + `promoStrip.css` (all classes `ps-` prefixed).
- `app/admin/promo-strip/` — the tab: live preview, 9 selectable cards each previewing the owner's own text, an
  **Apply** button that is disabled until something changes.
- `app/admin/AdminShell.tsx` — nav link under Platform (owner only).
- `app/(shop)/layout.tsx` — renders `<PromoStrip>`; the old `.rc-announce` CSS was deleted.
- `lib/types.ts`, `lib/api.ts` — `announcementStyle` on `StoreSettings`.

**Deliberate corner-cuts (ponytail)**
- `DEFAULT_STRIP_ID` (frontend) and `DEFAULT_STRIP_STYLE` (backend) are the same literal in two places,
  with a comment in each. Upgrade: expose the default from the API if it ever changes often.
- The frontend has no unit-test runner, so the geometry/UI are checked by browser run, not unit tests.

## 5. Checklist
- [x] Backend: lib + model + routes + tests (3 new tests pass; `tsc` clean)
- [x] Frontend: components, admin tab, nav link, shop layout (`tsc` and `eslint` clean)
- [x] Browser run (Playwright, real login): nav link shows; 9 cards; Apply disabled until a change; Diwali + new text
      applied; shop then rendered `ps-scene-diwali` with that text; empty text hid the strip; original text restored;
      zero console errors (no hydration warnings).
- [x] `playbook.md` updated (section 1c-3)
- [ ] Owner: look at it on a real phone, and confirm the Diwali wording
- [ ] Owner: decide whether the Platform tab's old banner box should also be mentioned in `docs/specs/admin-category-config.md`
      (left untouched; its text now points here)

## 6. Plain-English walkthrough
- The bar above the menu is now a small animated scene. A cyclist rides across it, pedalling, and each festival
  gives them a different outfit and trail (diyas and sparks for Diwali, a Santa hat for Christmas, balloons and a
  countdown for New Year…).
- In Admin → **Promo strip**, the owner types a message, clicks the look they like (each card already shows their
  message), and presses **Apply to the shop**. Clearing the message and applying hides the strip.
- Shoppers see the change the next time a page loads. Visitors who prefer reduced motion get a still strip.
- Adding a new festival later is a code change in one folder, not a settings change.

## Updates log
- 2026-11-01 — Built and verified; spec written alongside the code.
- 2026-11-01 — **Slimmer.** Strip 92px → 64px (Diwali 72px); bike drawing 72px → 52px; navbar ≈70px → ≈57px
  (padding 14→8px, logo 38→32px, wordmark 22→20px; `--rc-header-h` 70→57px so the hero still tucks under it).
- 2026-11-01 — **Countdown is configurable.** New setting `countdownEndsAt` (Date). `lib/promoStrip.ts` gains
  `countdownEndsAtSchema`, `nextNewYear()` (midnight 1 Jan **IST**, the default) and `withPromoStrip` now always
  returns the date as an ISO string. Catalogue rows can set `hasCountdown`; the admin shows a
  *Countdown ends (India time)* date box only for those looks (read/written in IST via `lib/indiaTime.ts`, so the
  clock time doesn't depend on the owner's device). The admin sends the date only when it was changed, so an untouched
  default is never frozen into settings. `Countdown` takes `endsAt`; past the end it shows zeros.
  Verified in the browser: custom date saved and the shop counted down to it; default restored afterwards. 4 more
  backend tests (7 total in `promoStrip.test.ts`).
- 2026-11-01 — **Calendar picker.** The browser's native `datetime-local` box was replaced with `DateTimeField`
  (`app/admin/components/`): a compact button showing e.g. "Tue, 3 Nov 2026 · 8:00 PM" that opens a month calendar
  (dropdown on desktop, bottom sheet with 49px tap targets on phones), hour / minute / AM-PM controls, Today and Done.
  Escape and outside-tap close it. Calendar maths is pure code in `lib/calendar.ts`. No new dependency.
  Verified in the browser at 1300px and 390px (touch): fits the screen, no sideways scroll, no console errors.
  ponytail: arrow-key movement between days is not built (Tab/Enter work); add roving focus if keyboard use matters.
- 2026-11-01 — **Apply button beside the calendar.** It first moved to the top of the page, then (feedback: the action
  belongs next to the inputs it commits) into one row with the countdown calendar: `[calendar] [Apply to the shop] status`.
  For looks with no countdown it sits right under the text field. A one-line status beside it reads *Unsaved changes* /
  *Applied…* / the error (replaces the banner boxes). On phones the row stacks and the button spans the width.
- 2026-11-01 — Review clean-up: the Apply button/status now comes from the shared `SaveRow` + `useSave` (admin/components);
  a corrupt stored countdown date falls back to the default; catalogue rows reformatted. No behaviour change.
