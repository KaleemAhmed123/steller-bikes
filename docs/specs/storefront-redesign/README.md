# Storefront Redesign — Spec Index

**Status:** Shipped (storefront-first pass; verified live on Atlas) · **Started:** 2026-10-18 ·
**Last updated:** 2026-10-18

## One-line pitch

A distinctive, art-directed customer-facing storefront for Raju Cycles — a cinematic scroll-driven
3D bicycle hero, an editorial homepage with section-specific layouts, and a redesigned
catalogue / product-detail / cards system — built on the existing Next.js + Express + MongoDB app
**without changing any backend route, schema, migration, or business logic**.

## The documents

| Doc | What it is |
|-----|-----------|
| [`plan.md`](plan.md) | The spec: task, what was asked, open questions (answered), the plan, and the build checklist. **Read this first.** |
| [`build-step-1.md`](build-step-1.md) | Walkthrough of the full redesign (hero v1, editorial homepage, cards/catalogue/detail, wishlist, seed). |
| [`build-step-2.md`](build-step-2.md) | Walkthrough of the cinematic 3D upgrade (hero v2 + second 3D moment) and the 3D-forward homepage with dedicated collection pages. |
| [`build-step-3.md`](build-step-3.md) | Walkthrough of the bike polish (clearcoat + filmic grade) and the product carousels (arrows + dots) restored to the homepage. |
| [`build-step-4.md`](build-step-4.md) | **Built** (typecheck + tests green; `next build` pending dev stop) — backend data fields so the frontend stops faking: `featured` flag, image gallery, honest popularity (read from orders), store settings. |
| [`build-step-5.md`](build-step-5.md) | **Built** (typecheck + tests + live E2E green; `next build` pending dev stop) — admin config: full product CRUD (variants, featured, photo upload, status) + a store-settings editor, with new `products.manage`/`settings.manage` permissions. |
| [`build-step-6.md`](build-step-6.md) | **Phase 1 built** (typecheck clean, live-verified; `next build` pending dev stop) — editorial "ElevenLabs" revamp: EB Garamond serif + off-white tokens + bigger 3-up Rapha/Aesop product card + editorial product-detail page. |
| [`build-step-8.md`](build-step-8.md) | **Built** (FE+BE typecheck clean; `next build` + in-browser look pending) — Stellar rebrand (real blue logo, name, Saleem's contact) + hero revamp (loading poster, 25% shorter scroll, text moves from first scroll, extruded 3D logo-mark replacing the second bike, model 2.39 MB → 104 KB) + the first-add cart-reset fix. |
| [`THIRD-PARTY-ASSETS.md`](THIRD-PARTY-ASSETS.md) | Licence + attribution register for any 3D model / imagery brought in. |

## Relationship to the rebuild

This is a **storefront-first visual + experience pass** layered on top of
[`../storefront-rebuild/`](../storefront-rebuild/) (the working app). It reuses that app's API
client, types, cart/account providers, and checkout flow. It supersedes the look-and-feel from
`../storefront-rebuild/ui-revamp.md`.
