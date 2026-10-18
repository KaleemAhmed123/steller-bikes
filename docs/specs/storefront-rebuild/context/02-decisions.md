# Context: Decisions and Open Questions

> **Living doc.** What's settled (with dates) and what's still on the table. Append, never rewrite —
> a changed decision gets a new dated entry, the old one stays.

## Locked decisions

| # | Decision | Date | Note / why |
|---|----------|------|------------|
| D1 | **Fresh rewrite, carry the blueprint** — new project, port v1's design, don't mold v1's code. | 2026-10-16 | v1 is platform-locked and unreadable; the valuable part is its design, which transfers. |
| D2 | **Stack: React + Node/Express + MongoDB.** | 2026-10-16 | Owner knows this stack; maintainability is the top priority for a small shop. |
| D3 | **MongoDB over PostgreSQL.** | 2026-10-16 | Owner's explicit choice. Postgres was recommended for relational money/stock; owner chose Mongo. Correctness is preserved via transactions on a replica set. |
| D4 | **Hosting: MongoDB Atlas free tier + a Node host (Render/Railway) + static React host.** | 2026-10-16 | Atlas free tier is a replica set → transactions work with no extra setup. |
| D5 | **Auth v1: staff/admin email+password login + guest checkout (cookie cart).** | 2026-10-16 | Covers the real MVP need; full customer accounts deferred. |
| D6 | **V1 = lean MVP:** catalog, cart, COD checkout, orders, inventory, core settings. | 2026-10-16 | Live fastest, lowest risk; everything else is a later phase. |
| D7 | **Money in paise (integers), INR.** | 2026-10-16 | No floating-point money, ever. |
| D8 | **New folder `raju-cycles-v2`; v1 kept as read-only reference.** | 2026-10-16 | Nothing lost; proven logic copied across. |
| D9 | **Frontend = Next.js (App Router), frontend-only. Express stays the backend API.** *(Overrides the Vite part of D2.)* | 2026-10-16 | Owner wants routing + SSR (server-side rendering, for SEO) out of the box. Next.js does the frontend; it does **not** use API routes and never touches MongoDB — Express remains the single authority on price/stock. |
| D10 | **Hosting: frontend on Vercel, backend on Render, DB on Atlas.** *(Replaces the generic Render/Railway + static host in D4.)* | 2026-10-16 | Vercel is the natural Next.js host; Render runs Express as one long-running Node server (simple DB connection). Two origins → the API now needs **CORS** (a backend allow-list for the frontend's domain). |

## Open questions — ANSWERED 2026-10-16

All answered at the scaffold approval. Outcomes locked below.

| # | Question | Answer | Why |
|---|----------|--------|-----|
| Q1 | TypeScript or plain JavaScript, both sides? | **TypeScript** ✅ | Catches money/stock/type bugs before they ship; v1 was TS. |
| Q2 | Mongoose (ODM) or the native MongoDB driver + Zod? | **Mongoose** ✅ | Schema + validation in one familiar place; less boilerplate. |
| Q3 | Auth mechanism: httpOnly cookie **session** or **JWT**? | **Cookie session** ✅ | Simpler and safer for a browser store; lands at build step 5. |
| Q4 | Storefront styling: port v1's hand-written CSS theme, or start fresh? | **Port v1's theme** ✅ | It's good, responsive, accessible, and free (ponytail — reuse). |
| Q5 | One repo with `backend/` + `frontend/` folders? | **Yes, one repo** ✅ | Simplest for a solo/small team. |
| Q6 | Seed data: port v1's 3 sample cycles? | **Yes** ✅ | Something to see on day one; clearly labelled samples. |
| Q7 | Atlas ready, or start local? | **Atlas** ✅ | Owner is creating a free cluster now; steps in `playbook.md` §1a. |

## Things that look one way but aren't (carried from the v1 audit)

- **MongoDB transactions need a replica set.** A bare local `mongod` can't do them. Use **Atlas**
  (free tier = replica set) or a local replica set for dev. Checkout correctness depends on this.
- **The cart never stores price.** Price is always looked up live on the server at view/checkout.
- **"Delivered" is not "paid".** For COD, delivered means handed over; cash reconciliation is a
  separate later concern.
- **Stock lives on the product's variant, not on the order.** Checkout therefore spans two
  documents and must be transactional.

## What the USER must do (not coding — only the owner can)

- Create a **MongoDB Atlas** account + a free cluster; share the connection string (a secret — put
  it in `.env`, never in chat or git).
- Decide the **Node host** (Render / Railway / other) when we reach deployment.
- Later phases only: **Razorpay** test account, a **verified email sender**, real **product
  photos/prices**, and **return/warranty policy** text.

---

*Last updated 2026-10-16 — D9–D10 added at build step 2 (frontend → Next.js App Router, frontend-only;
Express stays the backend; hosting Vercel + Render + Atlas). D1–D8 locked at the rebuild interview.*
