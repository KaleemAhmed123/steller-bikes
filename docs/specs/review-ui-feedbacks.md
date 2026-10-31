# Code review: branch `ui/feedbacks`

**Scope:** Promo strip, Shop info (map link, contact, About images), About page, slimmer navbar/strip, payment wording.
29 files committed since `main` (`99445cf`) + 14 modified / 12 new files not yet committed.
**Checked against:** DRY, KISS, YAGNI, Pragmatic Programmer, clean code.
**Rule for every fix below:** behaviour stays exactly as it is today. Nothing here removes or weakens a feature.
No code was changed for this review. Tick what you want fixed and we will do it in one pass.

Overall: the structure is sound (one catalogue, defaults in one lib per setting, client text isolated in `content.ts`,
seeded randomness, pure helpers, validation on the server). The points below are mostly small duplications and dead code.

---

## A. Worth fixing (small, safe, clear value)

| # | Principle | Where | Finding | Suggested fix |
|---|---|---|---|---|
| A1 | DRY | `promo-strip/page.tsx:41-75,109` and `platform/shop-info/useSave.ts` + `SaveRow.tsx` | Two copies of "save, then show *Unsaved changes / Saved / error*". CSS is duplicated too: `.promo-status*` (`promoPicker.css:4-5`) and `.si-status*` (`shopInfo.css:17-18`). | Move `useSave` and `SaveRow` to `app/admin/components/`, use them in the Promo strip page, keep one status style. |
| A2 | YAGNI | `backend/src/lib/shopInfo.ts:15` | `ABOUT_IMAGE_SLOTS` is exported and used nowhere. | Either delete it, or (better, see A3) use it. |
| A3 | DRY | `shopInfo.ts:58` (+ zod object, `models/settings.ts:32`), `AboutImagesPanel.tsx:18,27` | The five picture keys (hero, story, matters, brand, guarantee) are typed out by hand in ~6 places. Adding a sixth means editing all of them. | Backend: build the zod object and `EMPTY_ABOUT_IMAGES` from `ABOUT_IMAGE_SLOTS`. Frontend: derive `SlotKey` and `EMPTY` from one list. |
| A4 | DRY | `Bike.tsx:90-98` vs `pedal.ts:6` | The crank centre `(30,24)` is hard-coded in the drawing *and* in the leg maths. Change one and the legs detach. | Export the crank constant from `pedal.ts` and use it in `Bike.tsx`. |
| A5 | Clean code | `Showroom.tsx:61` | `settings ? paymentLabel(settings) : 'Cash on delivery'`. `settings` is optional only here (its single caller always passes it) and the fallback now disagrees with `paymentLabel` ("Pay Your Way · Online or at Delivery"). | Make `settings` required and drop the fallback, so the wording lives in `payment.ts` only. |
| A6 | Dead code | `shopInfo.css:12-14` | `.si-photo` is no longer used (the gallery moved to `.si-slot`). | Delete the three rules. |
| A7 | Docs drift | `docs/specs/shop-info.md:86` | The spec says the label is "Cash on delivery & online payment"; the code now says "Pay Your Way · Online or at Delivery" (your edit). | Update the spec line. |
| A8 | Accessibility | `DateTimeField.tsx:94` | `role="grid"` on the day grid, but there are no rows or cells, so it is invalid ARIA and can confuse screen readers. | Drop the role (plain buttons in a div work fine) or add real row/cell roles. |
| A9 | React correctness | `AboutImagesPanel.tsx:99` | Gallery rows use `key={i}`. Removing a middle photo makes React reuse the wrong row's local state (the "blurry" warning and error text can jump to a neighbour). | Give each gallery row a stable id when it is added. Not saved to the database. |

## B. Nice to have (low risk, do if time allows)

| # | Principle | Where | Finding | Suggested fix |
|---|---|---|---|---|
| B1 | DRY | `ImageField.tsx` vs `PhotoField.tsx` + `photoUpload.ts` | Two upload components that both call `uploadImage` and check `uploadConfigured()`. `ImageField` is still used by the product form and retailer logos. | Leave both for now. Later, let `ImageField` reuse the checks in `photoUpload.ts` so there is one set of upload rules. |
| B2 | Robustness | `promoStrip.ts:45` | `new Date(stored).toISOString()` throws `RangeError` if a stored date were ever corrupt, which would 500 the whole settings endpoint. | Fall back to the default date when the stored value is not a valid date (a two-line guard plus one test). |
| B3 | KISS | `parts.tsx:15` | `colors = ['']` is a placeholder trick so single-colour trails get `--c: ''`. | Make the colour optional and skip the variable instead. |
| B4 | Constants in two packages | `GALLERY_MAX` (`AboutImagesPanel.tsx:11`, `shopInfo.ts:16`), `DEFAULT_STRIP_ID` (`strips.tsx:136`), `IST_OFFSET_MS` (`indiaTime.ts:3`, `promoStrip.ts:30`) | Same value in frontend and backend, kept in sync by comments. Acceptable (separate packages), but each is a silent-drift risk. | Keep, but have the API send `galleryMax` with the settings so the admin never hard-codes it. Optional. |
| B5 | Readability | `strips.tsx:138-148` | Each catalogue row is one very long line (name, 150-character description, sample text). | Break onto multiple lines per row. No logic change. |
| B6 | Unused exports | `strips.tsx:136` (`DEFAULT_STRIP_ID`), `photoUpload.ts` (`MAX_PHOTO_MB`) | Exported but never imported elsewhere. | Un-export. (Type-only exports like `Pose`, `TrailKind` are harmless.) |
| B7 | Tests | frontend pure helpers: `calendar.ts`, `indiaTime.ts`, `pedal.ts`, `photoUpload.ts` (`specText`) | No tests; the project has no frontend test runner. Backend libs are well covered (18 passing). | Add `node --test` + `tsx` to the frontend for these pure files only. Not a framework. |
| B8 | Tests | `routes/admin.ts` settings PATCH | Validation is tested through the libs, not through the route (no auth test harness exists). | Cover with one route test when a harness exists. |
| B9 | Naming | settings `announcement` / `announcementStyle` | The feature is now "promo strip" but the stored names are the old ones. | Leave as is (a rename needs a data migration) and keep the explanatory comment. Do not rename. |

## C. Not code, but worth knowing

1. **Branch hygiene:** we are on `ui/feedbacks` (good). Shop info + photo upload + payment wording are not committed yet; commit before moving on.
2. **A secret was printed in this session.** The Atlas database password in `backend/.env` appeared in a tool output earlier. The file is git-ignored and the repo is clean, but rotate that password if this transcript is shared. The admin password you gave for Saleem is also in this chat: change it after first login.
3. **Docs to refresh (ask first, per project rules):** `docs/specs/admin-category-config.md` still says the announcement box is on the Platform tab, and `docs/specs/storefront-rebuild/context/**` predates all of this.
4. **Settings tab** still has Phone / WhatsApp fields that the shop no longer reads (decision pending from you).
5. **Line endings:** git warns "LF will be replaced by CRLF" on new files. A one-line `.gitattributes` would silence it.
6. **Performance to measure, not fix:** the promo strip's pedalling script runs on every shop page for every visitor. It pauses when the tab is hidden and when "reduce motion" is on, but check CPU on a low-end phone before launch.

## D. Looked at and fine (no action)

- One catalogue drives both the shop and the admin; adding a festival is one scene + one row + one CSS block.
- Defaults live in one lib per setting and are merged by one helper (`storeDefaults.ts`), so the two routes cannot drift.
- Server validates everything the admin sends (https-only links, phone shape, image links, gallery cap).
- Client About text is isolated in `content.ts`; layout cannot alter wording.
- SSR-safe randomness (seeded), reduced-motion respected, no sideways scroll at 320-1440 px, tap targets >= 40 px.
- Highlight logic in the sidebar is generic (longest match), not special-cased.

## Suggested order
1. A5, A6, A7, A8 (tiny, zero risk) 2. A4, A2+A3 (one list of picture slots) 3. A1 (shared save row) 4. A9 5. B2, B6, B3 6. the rest as you choose.
