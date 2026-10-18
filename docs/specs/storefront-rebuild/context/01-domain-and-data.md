# Context: Domain and Data

> **Living doc.** The data model, ported from the v1 prototype (which used 22 SQL tables) to
> MongoDB collections, trimmed to the MVP. This is the target; nothing is built yet.

## How we're translating v1 (SQL) → MongoDB

v1 used SQLite with 22 tables and foreign keys. MongoDB is a **document database** — it stores
JSON-like documents and prefers **embedding** related data inside one document over joining many
tables. So:

- **Embed** things that are read and written together and belong to one owner:
  variants inside a product, items inside an order, items inside a cart.
- **Separate collection** for things queried on their own or shared: products, orders, carts,
  inventory movements, settings, staff.

> **Why this matters for correctness:** embedding order items in the order means one write creates
> the whole order. But stock lives on the product's variants, so checkout must touch **two**
> documents (the new order + the product stock) — that is exactly why we need a **transaction**
> (replica set / Atlas).

## MVP collections

### `products`
One document per cycle, with its variants embedded.
```
{
  _id, slug (unique), name, category, description, image,
  specs: { "Wheel size": "29 inch", ... },
  status: "draft" | "published" | "archived",
  variants: [
    { _id, sku (unique), size, color,
      price,            // paise
      compareAt,        // paise, 0 = none
      stock,            // current on-hand
      lowStock }        // threshold for "low stock" warning
  ],
  createdAt, updatedAt
}
```
- Only `published` products show in the storefront.
- `price`/`compareAt` in **paise**.

### `carts`
One per shopper (guest cookie id or, later, user id), items embedded.
```
{ _id, owner (e.g. "guest:<uuid>"), items: [{ variantId, quantity }], updatedAt }
```
- The cart stores only *what and how many*. **Price and stock are looked up live** at view/checkout
  — never trusted from the cart.

### `orders`
One per placed order, items snapshotted (copied) in.
```
{
  _id, owner, email,
  address: { name, phone, line1, city, state, pin },
  items: [{ variantId, name, sku, quantity, price }],   // price copied at purchase time
  subtotal, discount, shipping, tax, total,             // all paise, server-computed
  method: "cod" | "razorpay",
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "refund_required",
  fulfillmentStatus: "confirmed" | "processing" | "packed" | "shipped" | "delivered"
                     | "delivery_failed" | "cancelled",
  tracking,
  idempotencyKey (unique),      // stops double orders
  createdAt, updatedAt
}
```
- Items are **snapshotted** (name/sku/price copied) so a later price or name change never rewrites
  history.

### `inventoryMovements`
An audit of every stock change (sale, manual adjust, cancel-restock).
```
{ _id, variantId, actor, reason, before, after, createdAt }
```

### `settings`
A single document holding store config (name, logo, hero text, shipping fee, free-ship threshold,
COD limit, serviceable PIN prefixes, checkout on/off, return window, policies).

### `staff`
```
{ _id, email (unique), passwordHash, role, active }
```
- v1 had a full roles+permissions system. For the MVP we keep a **small role set** (e.g. `owner`,
  `manager`) and a permission check in code; the full custom-role UI is a later phase.

## The two hard paths we port from v1 (do NOT simplify these away)

### 1. Checkout — no double orders, no overselling
1. The browser sends a checkout with an **idempotency key** (a one-time id).
2. If an order already exists for that key → return it (don't make a second).
3. Server recomputes totals from live prices + the real coupon + settings.
4. In a **transaction**:
   - For each item, **atomically decrement stock with a guard** —
     `updateOne({ _id, "variants.sku": sku, "variants.$.stock": { $gte: qty } }, { $inc: { "variants.$.stock": -qty } })`.
     If it matches 0 documents → stock ran out → **abort the whole transaction**.
   - Insert the order; write inventory movements; clear the cart.
5. If anything fails → nothing is written; tell the customer to refresh.

> **Why the guard + transaction:** two customers buying the last unit at the same moment. The guard
> (`stock >= qty`) lets exactly one succeed; the transaction makes sure the order and the stock move
> together or not at all. This is the single most important thing we carry from v1.

### 2. Order fulfillment — only legal state moves
A tiny state machine decides which status change is allowed:
```
confirmed → processing | cancelled
processing → packed | cancelled
packed → shipped | cancelled
shipped → delivered | delivery_failed
delivery_failed → shipped | cancelled
delivered, cancelled → (end)
```
- Shipping requires a tracking reference. Cancelling restores stock (once).

## Deferred to later phases (modelled, not built in MVP)

`coupons` · `documents` (CMS pages/campaigns) · `media` · `returns` · `roles` (full RBAC) ·
`auditLogs` · `webhookEvents` + `jobs` (payment/email) · `secrets` (encrypted provider keys) ·
`wishlists` · customer `users`. Each maps cleanly to its own collection when its phase arrives.

---

*Last updated 2026-10-16 — initial model written during planning; nothing built yet. Collection
shapes may be refined when the scaffold is approved.*
