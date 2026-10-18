# Customer Accounts — storefront sign-up / login / order history / address book

**Status:** Shipped & verified — typecheck + build clean, **26/26 tests pass on Atlas**, live
end-to-end smoke test green (signup → verify → claim, address book, cart-merge on login). ·
**Started:** 2026-10-18 · **Last updated:** 2026-10-18

> The first "later phase" after the UI revamp. Adds optional shopper accounts **on top of** guest
> checkout — guest checkout is never removed. Reuses the staff session + bcrypt machinery rather
> than building a second auth system.

## 1. What you asked for

- Customers sign up / log in / log out with **email + password**.
- **Order history** — see past orders.
- **Saved address book** — pick an address at checkout instead of retyping.
- **Claim past guest orders** by email.
- **Email verification + password reset** flows now, with a **mock email sender**; swap to SendGrid later.

## 2. Open questions — answered 2026-10-18

| # | Question | Answer |
|---|----------|--------|
| 1 | Login identity | **Email + password** (reuse staff pattern; phone/OTP later). |
| 2 | Account scope | **Accounts + saved addresses** (signup/login, order history, address book, checkout prefill). |
| 3 | Past guest orders | **Claim by email** — but see the correction below. |
| 4 | Email-dependent flows | **Build verification + reset now with a mock sender**; SendGrid later. |

**Correction raised & accepted (why verification isn't optional):** "claim guest orders by email" + "no
verification" together are a privacy hole — anyone could sign up with a stranger's email and read their
order history (name, phone, address). Fix, using the flow already chosen: **orders are claimed ONLY
after the email is proven** (verification link clicked, or password reset completed). Email alone never
claims. The mock sender prints the link to the server console; SendGrid later only changes how the link
is delivered.

## 3. Plan

**Core idea — one identity hook.** Every cart/order is already stamped with an `owner` string. Today
that's always the guest cookie (`guest:<uuid>`). We add **one** branch in the shared `guestCart`
middleware: if a customer is logged in, `owner = "customer:<id>"`. Cart, checkout and order history
then follow the customer automatically — no per-route rewiring.

```
Request → guestCart middleware
   ├─ session has customerId?  ──yes──►  owner = "customer:<id>"
   └─ no ──────────────────────────────►  owner = "guest:<uuid>"  (cookie, unchanged)

Login / signup:  guest cart  ──merge (sum quantities)──►  customer cart, then drop guest cart
Verify / reset:  guest orders with my email  ──relabel owner──►  mine   (proof required)
```

**Reused, not rebuilt:** the same `express-session` + Mongo store + bcrypt staff already use (added a
`customerId` to the session beside `staffId`); the same address field shape; the same authed-fetch
helper on the frontend.

**Files touched (~20).** Backend new: `models/customer.ts`, `lib/email.ts` (mock), `lib/tokens.ts`,
`lib/customerAuth.ts` (gate + merge + claim), `routes/account.ts`, `tests/accountFlows.test.ts`.
Backend edited: `lib/guest.ts` (owner resolution), `routes/orders.ts` (history list), `index.ts`
(mount), `lib/checkout.ts` (cosmetic actor fix). Frontend new: `/login`, `/signup`, `/account`,
`/account/verify`, `/forgot-password`, `/reset-password`, `AccountProvider`, `AccountNav`. Frontend
edited: `lib/api.ts`, `lib/types.ts`, shop `layout.tsx`, `checkout/page.tsx`, `globals.css`.

**Deliberately NOT changed:** price/stock/checkout-safety logic, the admin, payment methods (Razorpay
stays a later phase), the UI revamp styles (new pages reuse existing classes).

**Rejected alternatives:** a separate customer session/cookie (needless — one browser is only ever a
shopper or staff); a dedicated `tokens` collection (token hash + expiry as fields on the customer is
enough for one active token per purpose).

## 4. Tasks

- [x] `Customer` model (email unique, bcrypt hash, name, emailVerified, addresses[], verify/reset token hashes + expiries)
- [x] Mock email sender + one-time token helper (raw token emailed, sha256 hash stored)
- [x] Owner resolution in `guestCart` (customer beats guest cookie)
- [x] Account routes: signup, login, logout, me, verify, forgot, reset, address CRUD
- [x] Guest-cart merge on login/signup; guest-order claim on verify/reset
- [x] Order-history list route (`GET /api/orders`)
- [x] Frontend: account context + header link, auth pages, account dashboard, checkout prefill + address picker
- [x] CSS for auth/account/address book (reuses revamp tokens)
- [x] Typecheck (backend + frontend) + frontend production build — all clean
- [x] DB tests for merge + claim written
- [x] **Run DB tests on Atlas** — 26/26 pass (2026-10-18, after IP whitelisted)
- [x] **Live end-to-end smoke test** — guest order → signup (same email) → verify (console link)
      claims the order → order history shows it; address book add + default; cart-merge on login.
      Test data cleaned from the live DB, stock restored.
- [ ] Owner's own browser click-through (optional — flows already proven via API)

## 5. How it works, step by step (walkthrough)

### Identity (`lib/guest.ts`)
`guestCart` now checks `req.session.customerId` first. Logged in → `owner = "customer:<id>"`. Not
logged in → the existing guest-cookie path. One line of logic makes cart, checkout, and order history
all customer-scoped. The customer's *active* check is done by the `requireCustomer` gate on account
routes, so this stays a fast, synchronous middleware with no DB call.

### Sign up (`POST /api/account/signup`)
Validate (email, password ≥ 8, name) → reject if email taken → bcrypt-hash the password → create the
customer with a **verification token** (raw token emailed, only its sha256 hash stored, 24h expiry) →
send the mock verification email → log them in (set `customerId`) → **merge** any guest cart into the
new account. Returns the public customer (never the hash or token).

### Log in (`POST /api/account/login`)
bcrypt-compare; generic "wrong email or password" on any failure (no account-exists leak) → set
`customerId` → merge guest cart.

### Cart merge (`lib/customerAuth.ts → mergeGuestCart`)
Union the guest cart into the customer cart by variant, **summing** overlapping quantities, then delete
the guest cart row so it can't resurface. Creates the customer cart if none existed.

### Email verification (`POST /api/account/verify`)
Look up the customer by `hash(token)` with an unexpired token → mark `emailVerified` → clear the token
→ **claim guest orders**: relabel every `guest:*` order with this email to `customer:<id>`. Because
this runs only after the link is clicked, it's safe.

### Password reset (`forgot` + `reset`)
`forgot` always returns the same response regardless of whether the email exists (no enumeration), and
only sends a mock email + stores a hashed 1h token if it does. `reset` verifies the token, sets the new
bcrypt hash, and — since completing a reset proves inbox control — marks the email verified and claims
guest orders too.

### Address book (`/api/account/addresses` CRUD)
Addresses are a subdocument array on the customer. Add / edit / delete, with exactly one `isDefault`
(setting one clears the others; deleting the default promotes another). The first address added becomes
the default automatically.

### Order history (`GET /api/orders`)
Returns orders for `res.locals.owner`, newest first — the whole customer's history once logged in.

### Frontend
- `AccountProvider` fetches `me` once in the browser; a 401 just means "guest". `AccountNav` shows
  **Account** or **Sign in** in the header.
- Auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/account/verify`) are small
  client forms reusing `.field` / `.notice` / `.btn-primary`. The two `?token` pages are wrapped in
  `<Suspense>` (App-Router requirement for `useSearchParams`).
- `/account` is the dashboard: profile + verified badge, order history list, address book (add / set
  default / remove), sign out. Redirects guests to `/login`.
- **Checkout** prefills email + default address for a logged-in customer and offers a saved-address
  dropdown that fills the form.

## 6. Tests / verification

- **Backend typecheck:** clean. **Frontend typecheck + production build:** clean (all 16 routes,
  including the 6 new pages).
- **Logic tests (no DB):** 16/16 pass (cart view, permissions, product query, fulfillment).
- **New DB tests** (`tests/accountFlows.test.ts`): cover cart-merge (sum overlaps, create-if-missing)
  and order-claim (only matching email, never others). **Not yet executed** — this machine's IP isn't
  whitelisted on Atlas, so every DB-touching test (including the pre-existing checkout/admin suites)
  can't connect. Whitelist the IP, then `npm test` runs them.
- **No live click-through yet** — the backend can't reach Atlas either, so a running demo is blocked on
  the same whitelist step.

## 7. Edge cases & limitations

- **Mock email** — verification/reset links are printed to the backend console, not delivered. `ponytail:`
  marked in `lib/email.ts`; swap the body of `sendEmail()` for SendGrid, no caller changes.
- **No change-password / change-email while logged in** — reset-by-link is the only password path for now.
- **Unverified accounts can still log in and shop** — verification only gates *claiming guest orders*,
  by design (smooth UX; the one privacy-sensitive action is the one gated).
- **One active token per purpose** — requesting a new reset link invalidates the previous one. Fine for v1.
- **Phone/OTP login** not built (deferred); phone is still collected per delivery address.
- **Claiming relabels `owner`** on past guest orders; a shared email across two people would merge their
  guest orders into whoever verifies first. Acceptable for a single-shop MVP.
