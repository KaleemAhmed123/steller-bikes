# Ops, delivery & product media — advance-payment links, Kanpur fee, variant media

Branch: `frontend/UI-Revamp` · Status: **IN PROGRESS** · Created 2026-10-26
Append-only: new changes go in the Updates log at the bottom.

## 1. Task
Make the back-office run the way the shop actually sells: an agent calls the customer, collects an
advance for delivery through a payment link the customer sees under their order, and the owner can
manage order payments, product media and the homepage video without a developer.

## 2. Asked for
1. Admin login `saleem@stellarbikes.in` seeded as **owner** (done 2026-10-26).
2. Hero video plays once and **stops on the last frame** (no loop).
3. Empty `/about` page (content later).
4. Fix the responsive overflow when the window is resized.
5. Per-variant **media list** (images + videos), each with an explicit **position**; the gallery swaps
   when the shopper picks a variant. No media → a "No Image Available" box with the Stellar logo.
6. Clear way to add products in the admin.
7. Admin orders page: update payment status (same rules as Payments tab); COD marked **delivered →
   auto paid**.
8. **Advance-payment link** on any order (Razorpay Payment Link), visible to the customer under their
   order, with its status visible in the admin. Built dormant until Razorpay keys exist.
9. Checkout: **pincode → city/state autofill** (free API). Flat **₹299 Fitted Delivery inside Kanpur**;
   elsewhere "charges per Delhivery distance, agent will call". All orders: "agent will call to confirm".
   Shown on product page, cart, checkout, footer. Applies to every product.
10. Admin can upload/remove the **hero video** (desktop + mobile) via Cloudinary.
11. Loading UX: **shimmer** skeletons for boxes; full-page loading = blank page with blinking Stellar
    logo and "STELLAR" revealing S→R smoothly.

## 3. Decisions (owner)
| # | Decision |
|---|---|
| Variant with no media | "No Image Available" box with the Stellar logo centred — **no** fallback to product images. |
| Variant media | Images **and** videos; each has a `position`; admin reorders; max 10 per variant. |
| Cards/listings | Show the first *image* only; videos live on the product page. |
| Pincode lookup | Free India Post API, called **through our server** (cached); manual entry if it fails. |
| Kanpur fee | Server decides from the pincode/district; ₹299 flat, every product. Other pincodes: delivery "to be confirmed", added later via the agent's payment link. |
| Payment links | Razorpay Payment Links + webhook + admin "Check with Razorpay" button. Keys don't exist yet → feature stays off until `RAZORPAY_*` are set. |
| Cloudinary | Frontend vars `NEXT_PUBLIC_CLOUDINARY_*` (documented in `frontend/.env.example`); values added by owner later. |
| Old orders | Leave as they are (no retroactive delivery fee). |

## 4. Plan (atomic commits, in order)
- **A** quick fixes: video no-loop · About page · overflow fix
- **B** media: variant media model + validation · storefront gallery swap + placeholder · admin variant media editor · "add product" clarity
- **C** orders: payment status control · COD delivered→paid · advance-payment link (create / show / webhook / check)
- **D** delivery: pincode lookup endpoint + autofill · Kanpur fee in pricing · messages (product, cart, checkout, footer)
- **E** hero video upload (admin) 
- **F** loading UX: shimmer skeletons + branded page loader

## 5. Checklist
- [x] Admin seeded
- [ ] A: video no-loop · About · overflow
- [ ] B: media model · gallery · admin editor · add-product clarity
- [ ] C: payment status · COD→paid · payment link
- [ ] D: pincode autofill · Kanpur ₹299 · messages
- [ ] E: hero video upload
- [ ] F: shimmer + branded loader

## Updates log
- 2026-10-26 — spec created; admin seeded; Cloudinary vars documented.
