# Frontend Production-Readiness Audit — Stellar Bikes (Stellar Bikes v2)

- **Date:** 2026-10-21
- **Branch:** `main`
- **Latest commit at audit time:** `b74c820` (fix(backend): set explicit rootDir so prod tsc build is deterministic)
- **Working tree:** dirty (in-progress polish branch — many `M`/`??` files; audit read the working-tree state)
- **Auditor scope:** `frontend/` only (Next.js 15 App Router + React 19). Express backend out of scope except as an integration surface.
- **Method:** source review of all route/layout/provider/lib/component files + live runtime pass (Chrome DevTools: a11y tree, console, network, Lighthouse, performance trace, screenshots at desktop 1440 and mobile 390). Build + typecheck executed.

> **One-line verdict:** A genuinely well-built, disciplined frontend that is **close to production-ready but not there yet.** No Critical defects and no broken core journey. The blockers are a mobile header that overflows, a handful of real accessibility gaps, a hydration-mismatch console error, and **zero automated tests or linting**.

> **⟳ Update — 2026-10-21 (Sprint 1 applied):** all **6 P1 findings fixed and verified** — FE-001 (mobile icon-only header), FE-002 (nav contrast), FE-003 (homepage `<h1>` + heading order), FE-004 (hydration script removed), FE-006 (skip link), FE-007 (shared error toast + cart stepper lock) — plus FE-012 (ESLint 9 flat config with `jsx-a11y`). Verified: lint/typecheck/build clean; **Lighthouse mobile Accessibility 100** (was 95); hydration error gone from console. Details: [`docs/specs/frontend-sprint-1-p1-fixes.md`](specs/frontend-sprint-1-p1-fixes.md). Remaining items are P2/P3.

---

## 1. Audit Title, Date, Branch, and Commit

See header above. This report is the only artifact created; **no application code, styles, config, tests, or dependencies were changed.**

---

## 2. Executive Summary

**Overall readiness verdict: CONDITIONAL GO.** Fix the P1 items (below) before launch; the rest can follow.

Stellar Bikes is an online store + owner admin for a cycle shop in Kanpur. The storefront is a Next.js App Router app with a cinematic 3D hero, an editorial design, and a server-authoritative commerce model (price/stock computed by the Express API, never trusted from the client). The engineering quality is **above average for a small-shop build**: error boundaries exist at every level, forms lock on submit, the cart uses an idempotency key, images have a safe fallback, and the 3D hero is defensively loaded (WebGL feature-detection, error boundary, off-screen render pause, reduced-motion gating).

**Totals:** 28 findings.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 3 |
| Medium | 12 |
| Low | 11 |
| Informational | 2 |

| Priority | Count |
|---|---|
| P0 (block release) | 0 |
| P1 (fix before release) | 6 |
| P2 (next cycle) | 13 |
| P3 (backlog) | 9 |

**Most serious functional problems**
- **Mobile header overflows** — on a phone, "Sign in" wraps to two lines and "Cart" is clipped off the right edge (verified by screenshot at 390px). The storefront never collapses its nav into a menu, though the admin does. *(FE-001)*
- **Silent failures on quick actions** — cart +/- steppers, remove, "make default" address, card quick-add, and logout have no error handling and no on-screen feedback; a failed network call just does nothing. *(FE-007)*
- **Hydration mismatch** — an inline script that sets `data-over-hero` on `<body>` before React hydrates logs a React hydration error on every homepage load. *(FE-004)*

**Highest-impact UI/UX problems**
- Cart link fails colour contrast (**1.09:1**, white on near-white) in one header state. *(FE-002)*
- Homepage has **no `<h1>`** and the heading order skips levels. *(FE-003)*

**Important accessibility issues:** contrast (FE-002), missing h1 / heading order (FE-003), no skip link (FE-006), keyboard-inoperable fake radio group on the product page (FE-005). Lighthouse mobile **Accessibility = 95**.

**Significant responsive issues:** the mobile header (FE-001) is the main one; the rest of the storefront reflows well.

**Performance (evidence-backed, with caveats):** build is clean (26 routes). The 3D hero is correctly code-split, but the **three.js stack + a 640 KB model still download on WebGL phones** (FE-009). The admin dashboard is a 232 KB first load (Recharts, eager) (FE-010). A dev-mode trace showed LCP 2.5 s dominated by dev-server TTFB — **not a production number** (FE-025).

**Critical React/Next.js defects:** the hydration mismatch (FE-004) and a cart-stepper request race (FE-008).

**Missing tests/verification:** **no test runner, no ESLint, no `jsx-a11y` rules** — there is no automated regression protection at all (FE-012). This is the single biggest maintainability gap.

**Not inspected at runtime:** admin screens behind login (dashboard, orders, inventory, payments, product CRUD) were reviewed at source but not click-tested live; collection pages, order confirmation, password-reset, and the Razorpay online-pay popup were not exercised end-to-end. Real-device and real-network performance was not measured (localhost dev only).

### Top 5 remediation actions
1. **Make the storefront header responsive** (collapse to a menu/drawer under ~720px). *(FE-001, P1)*
2. **Fix the Cart contrast + add an h1 + skip link + heading order.** *(FE-002, FE-003, FE-006, P1)*
3. **Add a shared error surface** (toast/inline) and wrap every mutation handler so nothing fails silently. *(FE-007, P1)*
4. **Remove the hydration-mismatch script** (set the over-hero state the React way). *(FE-004, P1)*
5. **Stand up a minimal test + lint baseline** (ESLint with `jsx-a11y`, plus a few Playwright smoke tests of the buy journey). *(FE-012, P1)*

---

## 3. Scope, Boundaries, and Methodology

**In scope:** everything under `frontend/` — routes, layouts, providers, components, `lib/` utilities, hooks, `globals.css`/`redesign.css`, `next.config.ts`, `tsconfig.json`, assets, and the frontend's consumption of the Express API.

**Out of scope (not modified, not judged on internals):** the Express backend, database, backend auth/RBAC, infrastructure. Where a concern depends on backend behaviour it is flagged as an integration note, not a frontend defect.

**What was actually executed**
- `npm run typecheck` → **exit 0** (clean).
- `npm run build` → **exit 0**, 26 routes (full route table in the Appendix).
- Booted backend (`:8000`) + exactly one frontend dev server (`:3000`) against the seeded Atlas DB.
- Chrome DevTools: accessibility snapshot, console log, network log, **Lighthouse (mobile navigation)**, **performance trace (reload, cache bypass)**, screenshots at 1440×900 and 390×844, product + home + mobile.

**Honesty notes:** runtime numbers come from a **development build on localhost without network throttling**, so TTFB/LCP are inflated and not representative of the Vercel production build. Findings that depend on this are marked. Admin-authenticated screens were source-reviewed only.

---

## 4. Frontend Architecture and Technology Inventory

| Area | Finding |
|---|---|
| Framework | Next.js **15.5.28**, App Router, React **19** |
| Language | TypeScript 5.7, `strict: true`, `noEmit`, path alias `@/*` |
| Routing | App Router, two route groups: `(shop)` (storefront) and `admin` |
| Styling | Two global stylesheets: `globals.css` (2365 lines) + `redesign.css` (1660 lines) = **~4025 lines**, CSS custom properties, `color-mix()`, no CSS framework, no CSS Modules |
| UI libs | `lucide-react` (icons), `recharts` (admin charts) |
| 3D | `three` 0.186, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `gsap` (hero only, dynamically imported) |
| State | React Context only — `CartProvider`, `AccountProvider`, `WishlistProvider`. No Redux/Zustand/React Query. Filters/sort are **URL state** |
| Data fetching | Plain `fetch` in `lib/api.ts`, `cache: 'no-store'` for live price/stock; custom `useInfiniteList` hook for paging |
| Forms | Native controlled inputs + HTML validation (`required`, `pattern`, `minLength`). No form library |
| Fonts | `next/font/google` (EB Garamond, Space Grotesk, Inter) — self-hosted, no layout shift |
| Images | `next/image` via a `SafeImage` wrapper + `safeSrc` allow-list; Cloudinary remote pattern; `dangerouslyAllowSVG` with a locked-down CSP |
| Testing | **None.** No test runner, no ESLint config, no lint script |
| Payments | Razorpay via on-demand script injection (no npm dep); COD default |

**Dependency posture:** lean and appropriate. The only heavy cluster is the 3D stack, and it is already isolated to a client-only dynamic import. No duplicate libraries, no obvious dead dependencies.

---

## 5. Route and Page Inventory

`ƒ` = server-rendered on demand, `○` = static (from the production build).

| Route | Purpose | Group | Key states | Live-checked |
|---|---|---|---|---|
| `/` ƒ | 3D hero homepage + category/rail sections | shop | hero loader, fallback | ✅ desktop+mobile |
| `/shop` ƒ | Catalogue: filters, sort, infinite scroll | shop | loading, empty, error | ✅ (source + nav) |
| `/p/[slug]` ƒ | Product detail, gallery, variant buy panel | shop | not-found, add states | ✅ mobile |
| `/cart` ƒ | Cart lines, steppers, subtotal | shop | loading skeleton, empty | source |
| `/checkout` ƒ | Address form, COD/online pay | shop | submitting, error, empty | source |
| `/order/[id]` ƒ | Order confirmation | shop | — | source |
| `/collections/[slug]` ƒ | Curated collections | shop | — | not run |
| `/saved` ƒ | Wishlist (localStorage) | shop | empty | source |
| `/login` `/signup` ƒ | Customer auth | shop | error, busy | source |
| `/forgot-password` `/reset-password` ƒ | Password recovery | shop | — | source |
| `/account` `/account/verify` ƒ | Dashboard, orders, addresses | shop | skeleton, redirect | source |
| `/admin` ○ | Dashboard (Recharts) — **232 KB first load** | admin | checking-access | source |
| `/admin/orders` `/orders/[id]` | Order ops + fulfilment state machine | admin | — | source |
| `/admin/products` `/products/new` `/products/[id]` | Product CRUD | admin | busy, error | source |
| `/admin/inventory` | Stock adjust + movements | admin | — | source |
| `/admin/payments` `/platform` `/settings` `/notes` | Owner-only ops | admin | — | source |
| `/_not-found` ○ | 404 | root | — | ✅ (tree) |

---

## 6. Component and Design-System Inventory

**Shared controls / high-impact components reviewed:**

| Component | Role | Notes |
|---|---|---|
| `CartProvider` / `AccountProvider` / `WishlistProvider` | App-wide state | Error-safe on load; **no error channel for mutations** (FE-007) |
| `SafeImage` + `lib/img.ts` | Image safety net | `safeSrc` allow-list + `onError` placeholder swap — good |
| `useInfiniteList` | Paging hook | De-dupes by id, retains items on error, offers retry — good |
| `AddToCart` | Variant picker + qty + add | Fake ARIA radios, no arrow keys (FE-005) |
| `ProductCard` | Grid card + quick-add | Quick-add swallows errors silently (FE-007) |
| `FilterBar` | URL-synced filters | Debounced; solid |
| `ProductForm` | Admin product CRUD | Strong; no unsaved-changes guard (FE-014), `key={index}` (FE-015) |
| `AdminShell` | Admin guard + nav + mobile drawer | Client-only gate (FE-027); has a hamburger (storefront does not) |
| `BikeHero` / `BikeCanvas` | 3D hero | Exemplary defensive loading; heavy mobile payload (FE-009) |

**Design tokens:** two overlapping namespaces coexist — `--background/--foreground/--accent/--primary` (from the v1 port) and `--rc-ink/--rc-surface/--rc-muted/--rc-hairline` (the redesign). They are used interchangeably, sometimes in the same rule block (FE-016).

---

## 7. UI/UX and Visual Design Assessment

**Strengths (verified by screenshot):** the homepage first impression is genuinely premium — a real-time red 3D bike on a warm-dark stage, "RIDE" (solid) / "YOUR CITY" (gold outline) kinetic headline, clear primary CTAs. The editorial serif/Inter pairing is consistent, spacing has rhythm, and the "SAMPLE" labelling is honest and consistent. Visual quality scores **4/5**.

**Issues:**
- The gold **outline headline overlaps the rear wheel**, slightly reducing legibility (intentional editorial choice; acceptable).
- Cart link contrast failure in one header state (FE-002).
- `"SCROLL TO EXPLORE"` overlaps the CTA row on short mobile viewports (minor).

See detailed findings FE-002, FE-016.

---

## 8. Navigation and User-Journey Assessment

- **Primary nav:** Shop / Saved / Account / Cart in a sticky header. Clear and discoverable on desktop. **Breaks on mobile (FE-001).**
- **Breadcrumbs** on product pages (Shop / Category / Product) with correct `aria-current`.
- **Active-route indicators** present in admin nav.
- **404** handled with an on-brand shop-shell not-found page.
- **Filters/sort live in the URL** → shareable, bookmarkable, back-button friendly.
- **Post-login** always lands on `/account`; no "return to where you were" (FE-022).

Core buy journey (home → shop → product → cart → checkout → order) is coherent and low-friction. The checkout is a single screen with a running order summary.

---

## 9. Responsive and Cross-Device Assessment

Tested at 1440×900 (desktop) and 390×844 (mobile), with Lighthouse mobile emulation.

- **Confirmed defect:** storefront header overflow at mobile width — "Sign in" wraps, "Cart" clipped (FE-001). Reproduced on home and product pages.
- Homepage rails correctly collapse to single-card carousels on mobile with pagination dots.
- Product page reflows cleanly to a single column.
- No horizontal page scroll observed on the body at 390px (the header is the exception).
- The 3D hero still mounts on mobile WebGL devices (FE-009).

Viewports **not** tested: 320 (narrow), 768 (tablet), 1920 (wide). Marked unverified.

---

## 10. Accessibility Assessment

**Lighthouse mobile Accessibility: 95/100.** Strong baseline — semantic landmarks (`banner`/`navigation`/`main`/`contentinfo`), accessible button names, wishlist buttons expose `pressed` state, the cart toast is an `aria-live="polite"` status region, images carry alt text, the specs table uses `<caption>` + `scope`, and `prefers-reduced-motion` is globally respected (`* { transition:none; animation:none }`).

**Confirmed gaps:**
- **Colour contrast** — Cart link **1.09:1** (FE-002). *WCAG 1.4.3.*
- **Missing `<h1>`** on the homepage; **heading order skips** (footer `<h4>` with no preceding `<h3>`) (FE-003). *WCAG 1.3.1.*
- **No skip-to-content link** though `<main id="main">` exists (FE-006). *WCAG 2.4.1.*
- **Fake radio group** in `AddToCart` — `role="radio"` buttons without arrow-key navigation / roving tabindex (FE-005). *WCAG 4.1.2 / keyboard.*
- Carousel pagination uses `role="tab"` without a `tabpanel` relationship (FE-028).

**Not verified:** screen-reader walkthrough, full keyboard traversal of checkout and admin, focus management after the Razorpay popup.

---

## 11. Forms and Interaction-State Assessment

**Strong:** all forms are controlled, lock on submit (`disabled={busy}`), show inline errors, and preserve input on failure. Checkout uses `inputMode="numeric"` + `pattern` for phone/PIN and a **per-attempt idempotency key** so a double-submit can't create two orders. Signup enforces `minLength={8}`.

**Gaps:**
- **Missing `autocomplete`** on email/password/address inputs — weaker autofill + password-manager behaviour (FE-013).
- **No unsaved-changes guard** on the long admin product form (FE-014).
- **No password-visibility toggle** on auth forms (FE-023).
- Error messaging on phone/PIN relies on the native browser bubble only (acceptable).

---

## 12. Loading, Empty, Error and Success States

**Excellent coverage** — this is a highlight:
- **Loading:** cart + account use skeletons; the hero shows a loader poster until the model is ready; admin shows "Checking access…".
- **Empty:** cart empty state, "no cycles match" grid empty state, "no orders yet", "no saved addresses" — all with next-action links.
- **Error:** segment (`error.tsx`) + root (`global-error.tsx`, with inlined styles since it can't rely on the failed layout) boundaries; the shop page catches an API failure with "Is the API running?"; `useInfiniteList` keeps rendered items and offers retry.
- **Success:** add-to-cart toast (`aria-live`), checkout → order confirmation redirect, admin save → list + refresh.

**The weak spot** is the opposite of missing states — it's **unhandled** states on quick actions (FE-007): the stepper, remove, make-default, quick-add, and logout have no error path at all.

---

## 13. React and Component Architecture Assessment

Components are small, single-purpose, and cohesive; business logic stays out of presentation; providers are thin. No prop-drilling of note, no god-components, no circular dependencies observed. Server/client split is deliberate (product + shop pages are server components that hydrate small client islands). **4/5.**

Issues: the hydration-mismatch script (FE-004) and `key={index}` on editable rows (FE-015).

---

## 14. React Correctness and Hooks

Hook usage is disciplined: effects have correct dependency arrays, `useCallback`/`useRef` are used appropriately, the GSAP effect cleans up (`mm.revert()`, `st.kill()`), the IntersectionObserver disconnects, and the Razorpay script is memoised at module scope.

Issues:
- **Cart stepper request race (FE-008)** — rapid +/- clicks fire overlapping PATCHes with no in-flight lock; out-of-order responses can leave the wrong quantity.
- `crypto.randomUUID()` at mount requires a secure context (fine on Vercel HTTPS/localhost; would throw on plain-HTTP non-localhost) — edge note.

---

## 15. TypeScript and Frontend Type Safety

`strict: true`, typecheck clean. API responses are typed; `lib/types.ts` mirrors the backend contract. A small number of unavoidable `as unknown as { Razorpay }` casts for the injected global (well-contained). **No runtime validation** of API payloads (e.g. Zod) — acceptable given the backend is first-party, but worth noting that the types are compile-time promises only. **4/5.**

---

## 16. Next.js Frontend Assessment

- App Router used consistently; nested layouts per route group; no Pages Router remnants.
- Loading/error/not-found files present; metadata set at root and per-product (`generateMetadata`).
- 3D hero correctly `dynamic(..., { ssr: false })` and code-split (confirmed in the network log as a separate chunk).
- **`NEXT_PUBLIC_*` values are all public-by-design** (API URL, Razorpay test key id, Cloudinary cloud/preset) — no server secret exposed to the browser (verified).
- **Defects:** hydration mismatch from the inline body script (FE-004); **no Open Graph / Twitter / canonical / JSON-LD** beyond title+description (FE-011); Next warns the product LCP image lacks `priority` (FE-020).

---

## 17. State Management and Data Fetching Assessment

The Context-only approach is right-sized — no over-globalization. Filters/sort are URL-driven (correct for shareable catalogue state). `cache: 'no-store'` keeps price/stock fresh. `useInfiniteList` is a clean, dependency-free pager with de-duplication.

Gaps: no request cancellation/abort on filter changes or unmount (the stepper race, FE-008, is the visible symptom); no cache layer (acceptable given no-store intent).

---

## 18. Frontend-to-Express API Integration Assessment

`lib/api.ts` is a clean, typed client: single base URL from env, consistent error extraction (`json.error.message`), `credentials: 'include'` for cookie-scoped calls, `getProduct` maps 404→null, `getSettings` never throws. CORS preflights succeed (observed `OPTIONS … 204` then `GET … 200`).

Gaps: no timeouts/abort, no explicit per-status handling (401/409/429/5xx all collapse to a generic thrown message), and the guest **401 on `/api/account/me` logs a console error on every anonymous page load** (FE-021). The dev **port mismatch risk** (backend defaults differ from the frontend default) is correctly handled here because `.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:8000` to match `PORT=8000` — but it is a documented foot-gun (playbook §1d).

---

## 19. Frontend Security and Privacy Assessment

**Good posture overall:**
- No hard-coded secrets; no server secret in any `NEXT_PUBLIC_*` (verified).
- `dangerouslySetInnerHTML` is used **once**, with a **static string** (no user data) — not an XSS vector, but it causes the hydration issue (FE-004) and would need a CSP nonce under a strict script CSP.
- SVG product images are allowed but sandboxed via `next.config.ts` CSP (`script-src 'none'; sandbox`) + `Content-Disposition: attachment`.
- `SafeImage`/`safeSrc` prevent arbitrary remote image hosts.
- Wishlist uses `localStorage` for non-sensitive per-device data only, wrapped in try/catch.

**Notes (not vulnerabilities):** admin auth is enforced **client-side in the UI** (FE-027) — acceptable only because the server gates every data call; the admin shell HTML/JS is still publicly served. No DOM-XSS, open-redirect, or token-in-storage issues found.

---

## 20. Performance and Core Web Vitals Assessment

**Build (production):** shared JS 103 KB; homepage first load 122 KB (3D excluded — it loads as a lazy client chunk, good); **`/admin` 232 KB first load** (Recharts, eager — FE-010). Overall the bundle budget is reasonable.

**Live evidence (dev localhost, unthrottled — directional only, FE-025):**
- Lighthouse mobile: CLS **0.109** (just over the 0.1 "good" line, FE-024); console errors fail the best-practices check.
- Performance trace: LCP **2511 ms** dominated by **TTFB 1684 ms** (dev SSR), CLS 0.06, **~500 KB oversized image bytes** (FE-018), minor forced reflow (3D), 10.7 KB legacy JS.

**Real concern that survives the dev caveat:** the **3D hero downloads three.js + the 640 KB `cycle.glb`** to every WebGL device including budget phones (FE-009). The `cinematic` flag only disables post-processing/reflections above 820px — it does **not** skip the engine or model on mobile. For a budget-bicycle audience on Indian mobile networks this is the highest-value perf fix.

**Must-do before claiming CWV pass:** run Lighthouse against the **deployed Vercel build** on a throttled mobile profile. The numbers here are not production numbers.

---

## 21. SEO and Shareability Assessment

**Lighthouse SEO: 100/100** — titles, descriptions, `lang`, crawlability all pass. Per-product `generateMetadata` is in place.

**Beyond the basics (gaps, FE-011):** no `metadataBase`, no Open Graph or Twitter card images (links shared on WhatsApp/social will have no preview card — notable for a shop that will be shared on WhatsApp), no canonical URLs, and **no `Product` JSON-LD structured data** (loses price/availability rich results in Google). `llms.txt` absent (informational only).

---

## 22. SEO and Browser Compatibility Assessment

- Modern CSS (`color-mix()`, custom props) is used widely. **`color-mix()` has no fallback (FE-017)** — on older Android WebView / Chrome < 111 the focus rings and some surfaces that rely on it render transparent, which can remove the only visible focus indicator on admin inputs. Given the likely device mix of the audience, this deserves a fallback.
- `prefers-reduced-motion` respected.
- No Service Worker / offline claim (none expected).
- Three.js emitted deprecation warnings and **silently downgraded soft shadows to hard shadows** (`PCFSoftShadowMap removed`) — a minor visual regression + console noise from version drift (FE-019).

---

## 23. Testing and Quality Assurance Assessment

**This is the weakest dimension — 1/5.** There is **no test runner, no test files, no ESLint configuration, and no lint script** in `frontend/`. The only automated checks are `tsc --noEmit` and `next build`. Consequences:
- No regression protection for the buy journey, forms, auth, or state.
- No `eslint-plugin-jsx-a11y`, so accessibility regressions (like the ones found here) are invisible to CI.
- The `// eslint-disable-next-line` comments scattered in the code are **inert** — there is no ESLint to disable.

See FE-012 (P1).

---

## 24. Dependencies and Maintainability Assessment

Dependencies are lean, current (Next 15.5, React 19), and purpose-fit; no duplicates. Maintainability is otherwise good (small components, clear naming, a thorough `docs/specs/` trail, a single `playbook.md`). The drags are: **no tests/lint** (FE-012), **dual design-token systems** (FE-016), **~4025 lines of hand-rolled CSS** with no token documentation, and a couple of **stale comments** (the GLB is 640 KB, not the "~1.2 MB" a comment claims — FE-026).

---

## 25. Production Configuration and Delivery Assessment

- Production build is clean and reproducible (`next build` exit 0, deterministic route table).
- `NEXT_PUBLIC_*` convention correct; no private value exposed.
- `next.config.ts` restricts remote images and sandboxes SVGs.
- Frontend deploys to Vercel; backend to Render; origins separated via `NEXT_PUBLIC_API_URL` + CORS.
- **Gaps:** no CI config running even typecheck/build on push (inferred — none found); no production-build Lighthouse/smoke-test gate; no documented rollback/verification step for the frontend specifically.

---

## 26. Missing UI/UX States and Production Safeguards

| Missing safeguard | Where | Finding |
|---|---|---|
| Error feedback on quick actions | cart stepper/remove, address ops, quick-add, logout | FE-007 |
| Mobile nav menu | storefront header | FE-001 |
| Skip-to-content link | shop + admin shells | FE-006 |
| Unsaved-changes guard | admin product form | FE-014 |
| OG/Twitter/JSON-LD | all shared routes | FE-011 |
| Automated tests + lint | whole frontend | FE-012 |
| `color-mix` fallback | focus indicators | FE-017 |
| Return-to-destination after login | auth flow | FE-022 |

---

## 27. Detailed Findings

### [FE-001] Storefront header does not collapse on mobile — nav overflows and clips
- **Category:** Responsiveness / UI-UX
- **Severity:** High · **Priority:** P1 · **Confidence:** Confirmed · **Verification:** Verified
- **Affected route:** all `(shop)` routes · **Affected viewport:** ≤ ~430px
- **Location:** `frontend/app/(shop)/layout.tsx` (header `nav.rc-nav`), `frontend/app/globals.css` (header rules)
- **Evidence:** Screenshots at 390×844 on `/` and `/p/trail-29` show "Sign in" wrapping to two lines and the "Cart" label clipped off the right edge. The admin shell (`AdminShell.tsx`) has a hamburger + drawer; the storefront has none.
- **Problem:** The four nav items render inline at every width; there is no breakpoint that collapses them into a menu, so they crowd and clip on phones — the primary target device.
- **Reproduction:** Open `/` at 390px width → observe the header right edge.
- **User impact:** "Cart" (a primary commerce action) is partially unreachable/illegible on mobile; looks broken.
- **Technical root cause:** No mobile navigation pattern for the storefront header.
- **Recommendation:** Add a breakpoint (~720px) that collapses the nav into a drawer/menu button, mirroring the admin pattern; keep Cart + a menu toggle always visible.
- **Verification criteria:** No clipping/wrapping of nav items at 320/375/390/430px; Cart reachable with a 44px target.
- **Related:** FE-010 (admin already has the pattern to reuse).

### [FE-002] Cart link fails colour contrast (1.09:1)
- **Category:** Accessibility
- **Severity:** High · **Priority:** P1 · **Confidence:** Confirmed · **Verification:** Verified (Lighthouse)
- **Affected route:** all `(shop)` routes (header) · **Location:** `a.cart-button` in header; `globals.css`/`redesign.css`
- **Evidence:** Lighthouse: *"insufficient color contrast of 1.09 (foreground #ffffff, background #f5f5f5, 13px)."* The white Cart label sits on a near-white header background in the non-over-hero state.
- **Problem:** White-on-near-white is effectively invisible. *WCAG 1.4.3 (AA, 4.5:1).*
- **User impact:** Cart link unreadable for all users in that header state; fails AA.
- **Technical root cause:** The `data-over-hero` colour scheme sets the Cart label white, but the light (scrolled/non-home) header background is near-white; the two states aren't both covered.
- **Recommendation:** Ensure the Cart (and all nav) text uses the ink colour on the light header and white only over the dark hero; verify both states ≥ 4.5:1.
- **Verification criteria:** axe/Lighthouse contrast pass in both header states.
- **Related:** FE-004 (the over-hero mechanism).

### [FE-003] Homepage has no `<h1>`; heading order skips levels
- **Category:** Accessibility / SEO
- **Severity:** Medium · **Priority:** P1 · **Confidence:** Confirmed · **Verification:** Verified (a11y tree + Lighthouse)
- **Affected route:** `/` (and footer site-wide) · **Location:** `frontend/app/(shop)/components/hero/BikeHero.tsx` (hero title is styled `<span>`s), footer `<h4>` in `(shop)/layout.tsx`
- **Evidence:** Accessibility tree shows the hero headline "RIDE"/"YOUR CITY" as generic text; the first heading on the page is the `<h2>` "Shop by category". Lighthouse `heading-order` fails on the footer `<h4>` "SHOP".
- **Problem:** No top-level `<h1>` on the primary landing page; heading levels jump (…→h2→…→h4). *WCAG 1.3.1.*
- **User impact:** Screen-reader users get no page-defining heading; document outline is misleading; weak SEO signal.
- **Recommendation:** Make the hero headline (or a visually-hidden element) the `<h1>`; demote footer `<h4>` to `<h3>` or restructure so levels don't skip.
- **Verification criteria:** Exactly one `<h1>` per page; Lighthouse heading-order passes.

### [FE-004] Hydration mismatch from inline `data-over-hero` script
- **Category:** Next.js / React
- **Severity:** Medium · **Priority:** P1 · **Confidence:** Confirmed · **Verification:** Verified (console)
- **Affected route:** `/` · **Location:** `frontend/app/(shop)/layout.tsx:29-34`
- **Evidence:** Console on every homepage load: *"A tree hydrated but some attributes of the server rendered HTML didn't match…"* with the diff showing `- data-over-hero="true"` on `<body>`.
- **Problem:** A server-rendered `<script dangerouslySetInnerHTML>` sets `data-over-hero` on `<body>` before hydration; the server HTML lacks the attribute, so React detects a mismatch.
- **User impact:** A React hydration error on every homepage visit (console noise, best-practices ding, risk of subtle client/server divergence). Works today but is fragile.
- **Technical root cause:** Mutating the DOM before hydration instead of expressing the state in React.
- **Recommendation:** Drive the over-hero header state from React (e.g. set it in the existing `HeaderHeroWatch` effect / a client component) or via a CSS-only approach keyed off the route, removing the inline body script.
- **Verification criteria:** No hydration warning in console on `/`.
- **Related:** FE-002.

### [FE-005] Product variant picker is a keyboard-inoperable ARIA radio group
- **Category:** Accessibility · **Severity:** Medium · **Priority:** P2 · **Confidence:** High · **Verification:** Partially verified (source + a11y tree)
- **Affected route:** `/p/[slug]` · **Location:** `frontend/app/(shop)/components/AddToCart.tsx:61-84`
- **Evidence:** `role="radiogroup"` with child `role="radio"` buttons and `aria-checked`, but no arrow-key handler and no roving `tabindex`.
- **Problem:** Native radios move selection with arrow keys and are a single tab stop; these custom radios don't — each is a separate tab stop and arrows do nothing. *WCAG 4.1.2 / keyboard expectations.*
- **User impact:** Keyboard/screen-reader users can't operate the option group as designed.
- **Recommendation:** Implement roving tabindex + ArrowLeft/Right/Up/Down selection, or use native `<input type="radio">` styled as chips.
- **Verification criteria:** One tab stop for the group; arrows change selection; `aria-checked` follows.

### [FE-006] No skip-to-content link
- **Category:** Accessibility · **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified
- **Affected route:** all · **Location:** `(shop)/layout.tsx` (has `<main id="main">` but no skip link), admin shell
- **Problem:** Keyboard users must tab through the whole header on every page. `#main` target exists but nothing links to it. *WCAG 2.4.1.*
- **Recommendation:** Add a visually-hidden-until-focused "Skip to content" link targeting `#main` as the first focusable element.
- **Verification criteria:** First Tab reveals a skip link that jumps focus to `<main>`.

### [FE-007] Silent failures on non-form mutations (no error surface)
- **Category:** UI-UX / Correctness · **Severity:** Medium · **Priority:** P1 · **Confidence:** High · **Verification:** Verified (source)
- **Affected routes:** `/cart`, `/account`, product grids, header logout
- **Location:** `CartProvider.tsx` (`update`/`remove` re-throw, no catch at call sites in `cart/page.tsx:77,85,103`); `account/page.tsx:82-90` (`makeDefault`/`removeAddress`/`logout` no try/catch); `ProductCard.tsx:39-43` (quick-add swallows error with an empty catch)
- **Evidence:** `CartProvider` only ever shows a **success** toast; there is no global error surface. `ProductCard`'s comment even says "CartProvider surfaces errors elsewhere" — it does not.
- **Problem:** If any of these network calls fails, the user gets **no feedback** — the UI silently no-ops (and in some cases throws an unhandled promise rejection).
- **User impact:** A failed "remove", "make default", or quick-add looks like the app ignored the click; erodes trust.
- **Technical root cause:** No shared error/toast channel; mutation handlers assume success.
- **Recommendation:** Add an error variant to the existing toast (or an inline error) and wrap every mutation handler; surface the thrown message.
- **Verification criteria:** Simulate a 500 on each action → a visible error appears; no unhandled rejection.
- **Related:** FE-008.

### [FE-008] Cart quantity steppers race on rapid clicks
- **Category:** React / API · **Severity:** Medium · **Priority:** P2 · **Confidence:** High · **Verification:** Partially verified (source)
- **Affected route:** `/cart` · **Location:** `cart/page.tsx:74-90`
- **Problem:** Each +/- click fires a PATCH immediately with no in-flight lock or debounce; overlapping responses can arrive out of order and leave the displayed quantity inconsistent with the server. The "−" at quantity 1 also calls `update(…, 0)` (a remove) without confirmation.
- **User impact:** Flicker / wrong final quantity on fast clicks; accidental line removal.
- **Recommendation:** Disable the steppers while a request is in flight (or debounce + send the final value); disable "−" at quantity 1.
- **Verification criteria:** Rapid clicks settle on the correct quantity; no overlapping PATCHes.

### [FE-009] 3D hero ships three.js + a 640 KB model to mobile WebGL devices
- **Category:** Performance · **Severity:** Medium (High for the audience) · **Priority:** P2 · **Confidence:** High · **Verification:** Verified (network + file size)
- **Affected route:** `/` · **Location:** `hero/BikeHero.tsx`, `hero/BikeCanvas.tsx`, `public/models/cycle.glb` (640 KB)
- **Evidence:** Network log shows `BikeCanvas` chunk + `gsap` + `/models/cycle.glb` loading on the homepage. `can3d` (WebGL support) gates mounting; the `cinematic` flag (≥820px) only disables post-processing/reflections — the engine + model still load on phones.
- **Problem:** Budget phones on slow networks download the full 3D stack + model after first paint.
- **User impact:** Data cost + jank for the core mobile audience, after the initial paint.
- **Recommendation:** On small/`reduced-motion`/low-memory devices, render the static `HeroFallback` and skip loading `BikeCanvas`/the GLB entirely (gate the dynamic import on the same condition as `cinematic`, not just WebGL support). Compress/Draco the GLB.
- **Verification criteria:** Mobile home does not request `cycle.glb` or the three.js chunk.

### [FE-010] `/admin` first load is 232 KB (Recharts eager)
- **Category:** Performance · **Severity:** Low · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified (build)
- **Location:** `app/admin/page.tsx` (dashboard charts)
- **Evidence:** Build: `/admin … 126 kB / 232 kB First Load JS` — by far the heaviest route.
- **Problem:** Recharts loads eagerly on the dashboard. Low user count (internal), so low severity.
- **Recommendation:** `dynamic()`-import the chart blocks; render KPI numbers first.
- **Verification criteria:** `/admin` first load drops materially; charts stream in.

### [FE-011] No Open Graph / Twitter / canonical / Product JSON-LD
- **Category:** SEO · **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified
- **Location:** `app/layout.tsx` metadata, `app/(shop)/p/[slug]/page.tsx` `generateMetadata`
- **Problem:** Links shared on WhatsApp/social show no preview card; products emit no structured data (no price/availability rich results); no `metadataBase`/canonical.
- **User impact:** Weaker sharing (a WhatsApp-first market) and weaker search presence for a commerce site.
- **Recommendation:** Add `metadataBase`, Open Graph + Twitter images (a product's photo), canonical URLs, and `Product` + `Offer` JSON-LD on product pages.
- **Verification criteria:** Rich-results test passes; social debuggers show a card.

### [FE-012] No frontend tests and no linting
- **Category:** Testing / Quality · **Severity:** High · **Priority:** P1 · **Confidence:** Confirmed · **Verification:** Verified
- **Location:** `frontend/package.json` (only `dev/build/start/typecheck`), no `.eslintrc`/`eslint.config`, no test runner
- **Problem:** Zero automated regression protection; no `jsx-a11y` lint, so the a11y defects in this report would not be caught by CI; `eslint-disable` comments are inert.
- **User impact:** Regressions ship undetected; the buy journey has no safety net.
- **Recommendation:** Add ESLint (`next/core-web-vitals` + `jsx-a11y`) and a lint script; add a handful of Playwright smoke tests (home→product→cart→checkout, login, admin login) and run both in CI.
- **Verification criteria:** `npm run lint` exists and passes; smoke tests run green in CI.

### [FE-013] Missing `autocomplete` on auth/address inputs
- **Category:** Forms · **Severity:** Low · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified (source)
- **Location:** `login/page.tsx`, `signup/page.tsx`, `reset-password`, `checkout/page.tsx`, `account/page.tsx` address form
- **Problem:** No `autoComplete="email" / "current-password" / "new-password" / "name" / "tel" / "postal-code"` etc. → weaker autofill + password-manager UX.
- **Recommendation:** Add the standard `autoComplete` tokens.
- **Verification criteria:** Browser autofill offers the right values; password managers detect new/current password.

### [FE-014] No unsaved-changes guard on the admin product form
- **Category:** Forms / UX · **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified (source)
- **Location:** `app/admin/components/ProductForm.tsx` (Cancel + route changes discard state)
- **Problem:** A long product/variant/spec form silently loses all edits on Cancel or navigation.
- **Recommendation:** Track dirty state and warn before discarding (and on `beforeunload`).
- **Verification criteria:** Navigating away from a dirty form prompts to confirm.

### [FE-015] `key={index}` on editable rows
- **Category:** React · **Severity:** Low · **Priority:** P3 · **Confidence:** High · **Verification:** Verified (source)
- **Location:** `ProductForm.tsx` variant/spec/gallery maps
- **Problem:** Index keys on reorderable/removable controlled rows can cause focus/state glitches when a middle row is removed.
- **Recommendation:** Key by a stable id (existing `_id`, or a generated row id).

### [FE-016] Two parallel CSS token systems
- **Category:** Design system / Maintainability · **Severity:** Medium · **Priority:** P2 · **Confidence:** Confirmed · **Verification:** Verified
- **Location:** `globals.css` (`--background/--foreground/--accent/--primary`) vs `redesign.css` (`--rc-ink/--rc-surface/--rc-muted/--rc-hairline`), used interchangeably (e.g. `.auth-card` uses both)
- **Problem:** Two token vocabularies for the same concepts invite drift and make theme changes error-prone.
- **Recommendation:** Pick one namespace, alias the other to it, document the scale, and migrate incrementally.
- **Verification criteria:** One canonical token set; a short tokens reference in `docs/`.

### [FE-017] `color-mix()` focus indicators have no fallback
- **Category:** Browser compatibility / Accessibility · **Severity:** Low-Medium · **Priority:** P2 · **Confidence:** Medium · **Verification:** Partially verified (source)
- **Location:** `globals.css` focus rules (e.g. lines ~1239-1240, 1307-1308) where admin inputs do `outline: none` + a `color-mix()` box-shadow
- **Problem:** On Chrome < 111 / older Android WebView, `color-mix()` is unsupported → the box-shadow (the *only* focus indicator after `outline:none`) renders transparent, removing the focus ring.
- **Recommendation:** Provide a solid-colour fallback before the `color-mix()` declaration, or keep a thin `outline` as the base and enhance with `color-mix()`.
- **Verification criteria:** Visible focus ring on a browser without `color-mix()` support.

### [FE-018] ~500 KB of oversized image bytes; unused `hero.jpg`
- **Category:** Performance · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Verification:** Verified (Lighthouse + file sizes)
- **Location:** `public/images/*` (`hero.jpg` 592 KB appears unused; `city-bike.jpg` 216 KB / `mountain-bike.jpg` 188 KB reused across many cards)
- **Recommendation:** Remove unused assets; ensure sample JPGs are reasonably sized; they already pass through `next/image`.

### [FE-019] Three.js version drift (soft shadows silently downgraded)
- **Category:** Best practices / Visual · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Verification:** Verified (console)
- **Evidence:** `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead`; `THREE.Clock … deprecated`.
- **Problem:** Intended soft hero shadows render hard; console warnings on every 3D load.
- **Recommendation:** Align the three/drei versions and use the current shadow-map constant.

### [FE-020] Next.js warns the product LCP image lacks `priority`
- **Category:** Performance / Next.js · **Severity:** Low · **Priority:** P3 · **Confidence:** Medium · **Verification:** Partially verified (console)
- **Affected route:** `/p/[slug]` · **Evidence:** Console: *"Image … mountain-bike.jpg detected as LCP. Please add priority…"*. `ZoomImage` does pass `priority`, so the flagged element may be a related-product card (`ProductCard`, no priority) or a `SafeImage` forwarding edge.
- **Recommendation:** Confirm which image is LCP; ensure the above-the-fold product image carries `priority` and that `SafeImage` forwards it.

### [FE-021] Guest `401 /api/account/me` logs a console error every load
- **Category:** UX / Integration · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Verification:** Verified (console/network)
- **Problem:** The "am I logged in?" probe 401s for every anonymous visitor and shows a red console error (handled correctly in code, but noisy and dings best-practices).
- **Recommendation:** Treat the unauthenticated check as a normal outcome (e.g. a lightweight endpoint returning 200 with `{authenticated:false}`, a backend change) or accept the console noise knowingly.

### [FE-022] Login always returns to `/account` (no intended-destination)
- **Category:** Routing / UX · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Verification:** Verified (source)
- **Location:** `login/page.tsx:27`, `signup/page.tsx:29`
- **Recommendation:** Support a `?next=` return URL so sign-in resumes the interrupted flow.

### [FE-023] No password-visibility toggle on auth forms
- **Category:** Forms / UX · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed · **Verification:** Verified (source)
- **Recommendation:** Add a show/hide toggle on password fields (login, signup, reset).

### [FE-024] Mobile CLS 0.109 (just over "good")
- **Category:** Performance · **Severity:** Low · **Priority:** P2 · **Confidence:** High · **Verification:** Verified (Lighthouse mobile)
- **Problem:** Likely the hero loader→canvas swap and/or late content. Borderline.
- **Recommendation:** Reserve the hero stage height; confirm fonts are `display: swap` with matched metrics. Re-measure on the production build.

### [FE-025] Dev-mode performance numbers are not production numbers
- **Category:** Performance (methodology) · **Severity:** Informational · **Priority:** P2 · **Confidence:** Confirmed
- **Note:** LCP 2.5 s / TTFB 1.68 s came from a **dev** server on localhost without throttling. Do **not** treat as prod CWV. Re-run Lighthouse against the deployed Vercel build with mobile throttling before sign-off.

### [FE-026] Stale code comments (GLB size, cart LCP)
- **Category:** Maintainability · **Severity:** Low · **Priority:** P3 · **Confidence:** Confirmed
- **Note:** `BikeHero.tsx` comments say "~1.2 MB model" — the file is 640 KB. Minor accuracy cleanup.

### [FE-027] Admin auth is a client-side UI gate (data is server-gated)
- **Category:** Security (defense-in-depth) · **Severity:** Informational · **Priority:** P3 · **Confidence:** Confirmed
- **Location:** `AdminShell.tsx` (calls `adminApi.me()`, redirects on failure); admin pages are statically prerendered (`○`).
- **Note:** Acceptable because every admin **data** call is cookie-gated server-side (out of scope to change). But the admin shell HTML/JS is publicly served and the gate runs after hydration ("Checking access…" flash). No data leak found. Consider documenting this as an accepted design.

### [FE-028] Carousel pagination uses `role="tab"` without a tabpanel
- **Category:** Accessibility · **Severity:** Low · **Priority:** P3 · **Confidence:** High · **Verification:** Verified (a11y tree)
- **Location:** home rail carousels (`RailCarousel`/`HomeRail`)
- **Problem:** `role="tab"` implies a `tablist`/`tabpanel` relationship that isn't present; these are carousel position dots.
- **Recommendation:** Use plain buttons with `aria-label="Go to slide N"` + `aria-current`, or a proper tablist structure.

---

## 28. Findings Summary by Severity and Priority

| ID | Title | Severity | Priority |
|---|---|---|---|
| FE-001 | Mobile storefront header overflow | High | P1 |
| FE-002 | Cart link contrast 1.09:1 | High | P1 |
| FE-012 | No tests / no lint | High | P1 |
| FE-003 | No h1 / heading-order skip | Medium | P1 |
| FE-004 | Hydration mismatch (over-hero script) | Medium | P1 |
| FE-007 | Silent mutation failures | Medium | P1 |
| FE-005 | Keyboard-inoperable radio group | Medium | P2 |
| FE-006 | No skip link | Medium | P2 |
| FE-008 | Cart stepper race | Medium | P2 |
| FE-009 | 3D stack/model on mobile | Medium | P2 |
| FE-011 | No OG/Twitter/JSON-LD | Medium | P2 |
| FE-014 | No unsaved-changes guard | Medium | P2 |
| FE-016 | Dual CSS token systems | Medium | P2 |
| FE-010 | Admin 232 KB first load | Low | P2 |
| FE-013 | Missing autocomplete | Low | P2 |
| FE-017 | color-mix focus fallback | Low-Med | P2 |
| FE-024 | Mobile CLS 0.109 | Low | P2 |
| FE-025 | Dev perf ≠ prod (method) | Info | P2 |
| FE-015 | key={index} on editable rows | Low | P3 |
| FE-018 | Oversized/unused images | Low | P3 |
| FE-019 | Three.js version drift | Low | P3 |
| FE-020 | Product LCP image priority | Low | P3 |
| FE-021 | Guest 401 console noise | Low | P3 |
| FE-022 | Login no return-to | Low | P3 |
| FE-023 | No password toggle | Low | P3 |
| FE-026 | Stale comments | Low | P3 |
| FE-027 | Client-only admin gate | Info | P3 |
| FE-028 | role=tab carousel dots | Low | P3 |

---

## 29. Findings Summary by Category

- **Accessibility (6):** FE-002, FE-003, FE-005, FE-006, FE-017, FE-028
- **Responsiveness (1):** FE-001
- **React/Next.js (4):** FE-004, FE-008, FE-015, FE-020
- **Performance (6):** FE-009, FE-010, FE-018, FE-024, FE-025, (FE-019 visual/perf)
- **UI-UX / Forms (6):** FE-007, FE-013, FE-014, FE-022, FE-023, (FE-016 design-system)
- **SEO (1):** FE-011
- **Testing/Quality (1):** FE-012
- **Security (2, informational):** FE-021, FE-027
- **Maintainability (2):** FE-016, FE-026

---

## 30. Prioritized Remediation Roadmap

**Sprint 1 — release blockers (P1)**
1. FE-001 Responsive storefront header (reuse admin drawer pattern).
2. FE-002 + FE-003 + FE-006 Accessibility quick wins: Cart contrast, h1, heading order, skip link.
3. FE-007 Shared error surface + wrap all mutation handlers.
4. FE-004 Remove the hydration-mismatch script.
5. FE-012 ESLint (`next/core-web-vitals` + `jsx-a11y`) + 5–6 Playwright smoke tests in CI.

**Sprint 2 — pre-launch polish (P2)**
- FE-005 keyboard radio group · FE-008 stepper lock · FE-009 skip 3D on mobile · FE-011 OG + JSON-LD · FE-014 unsaved-changes · FE-016 unify tokens · FE-010 admin chart split · FE-013 autocomplete · FE-017 color-mix fallback · FE-024 re-measure CLS on prod.

**Backlog (P3)**
- FE-015, FE-018, FE-019, FE-020, FE-021, FE-022, FE-023, FE-026, FE-028, and the FE-027 design note.

---

## 31. Production Release Gate Checklist

| Gate | Status |
|---|---|
| Typecheck passes | ✅ (exit 0) |
| Production build passes | ✅ (exit 0, 26 routes) |
| Lint configured + passing | ✅ (ESLint 9 flat + jsx-a11y; 0/0) — FE-012 fixed |
| Automated smoke tests for buy journey | ❌ (Playwright deferred) — FE-012 |
| Mobile header usable (320–430px) | ✅ icon-only, verified — FE-001 fixed |
| WCAG AA contrast on nav | ✅ Lighthouse A11y 100 — FE-002 fixed |
| One h1 per page + heading order | ✅ verified — FE-003 fixed |
| No console errors on key routes | ⚠️ hydration fixed (FE-004); guest 401 remains (FE-021, P3) |
| OG/JSON-LD for sharing | ❌ — FE-011 |
| Production-build Lighthouse (throttled mobile) | ⬜ not yet run — FE-025 |
| No secret in client bundle | ✅ verified |
| Error boundaries + empty/loading states | ✅ strong |
| Checkout idempotency / no double-charge (frontend) | ✅ (idempotency key; server authoritative) |

**Gate verdict:** Sprint 1 (all P1) is now done and verified. Remaining before a clean launch sign-off: add Playwright smoke tests for the buy journey (deferred half of FE-012) and run Lighthouse against the deployed Vercel build for real Core Web Vitals (FE-025).

---

## 32. Unverified Areas and Remaining Risks

- **Admin screens** (dashboard, orders, inventory, payments, product CRUD, settings, platform, notes) — source-reviewed, **not** click-tested live.
- **Journeys not exercised end-to-end:** checkout submit, Razorpay online-pay popup + verify, order confirmation, password reset, email verification, collection pages, wishlist page.
- **Viewports not tested:** 320, 768, 1024, 1920 (tested 390 + 1440).
- **No real-device / real-network testing**; no screen-reader pass; no cross-browser matrix (Chromium only).
- **Performance numbers are dev-mode** (FE-025) — production CWV unknown until measured on Vercel.
- **Backend behaviour** (status codes, error shapes, CORS in prod) assumed from the contract, not re-verified.

---

## 33. Appendix: Commands, Tests, Measurements, and Evidence

**Commands executed**
```
frontend> npm run typecheck     # exit 0
frontend> npm run build         # exit 0, 26 routes
backend>  npm run dev           # API on http://localhost:8000 (PORT=8000)
frontend> npm run dev           # http://localhost:3000 (single instance)
curl :8000/api/products         # seeded data returned (Trail 29, …)
```

**Production build route table (key rows)**
```
Route (app)                     Size   First Load JS
/ (home)                      6.09 kB      122 kB
/admin                         126 kB      232 kB   ← heaviest (Recharts)
/p/[slug]                     3.47 kB      119 kB
/shop                         1.52 kB      121 kB
/checkout                     2.65 kB      112 kB
+ First Load JS shared                     103 kB
```

**Lighthouse (mobile, navigation, dev server)**
```
Accessibility 95 · Best Practices 96 · SEO 100
Fails: color-contrast (Cart 1.09:1), heading-order (footer h4),
       errors-in-console (hydration + 401 + three warnings),
       CLS 0.109 (agentic), llms.txt (n/a)
```

**Performance trace (reload, cache bypass, dev, unthrottled — directional only)**
```
LCP 2511 ms  (TTFB 1684 ms / load 779 ms / render 37 ms)
CLS 0.06 · ImageDelivery ~500 kB wasted · LegacyJS 10.7 kB · forced reflow (3D)
```

**Asset sizes**
```
public/models/cycle.glb   640 KB   (comment claims ~1.2 MB — stale)
public/images/hero.jpg    592 KB   (appears unused)
public/images/city-bike.jpg 216 KB · mountain-bike.jpg 188 KB · road-bike.jpg 108 KB
```

**Console on `/` (homepage)**
```
[error] Hydration mismatch — <body data-over-hero="true">   (FE-004)
[error] 401 Unauthorized  (/api/account/me, guest)          (FE-021)
[warn]  THREE.Clock deprecated; PCFSoftShadowMap removed     (FE-019)
```

**Screenshots captured (session evidence):** homepage desktop 1440, homepage mobile 390 (header clip visible), product page mobile 390.

---

*End of report. No application code, styles, configuration, dependencies, or tests were modified in producing this audit.*
