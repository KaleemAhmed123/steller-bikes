# Build step 1 — admin notes

## 1. Task
- **Name:** Admin notes (taggable to order / product / inventory / general)
- **Status:** In progress
- **Started:** 2026-10-19
- **Last updated:** 2026-10-19

## 2. What you asked for
- Let the owner write notes instead of memorising, and **tag** them to an order, a product, an
  inventory item, or leave them general.
- Admin-only. Both owner and manager can use it.

## 3. Open questions (settled 2026-10-19)
1. **UI surface** → **inline widgets + a Notes tab.** Widget on order/product/inventory screens, plus
   `/admin/notes` for general notes and an all-notes overview.
2. **Delete policy** → **author or owner.** A staff member deletes their own notes; the owner deletes
   any. (We store the author email.)
3. (Default, named) **No edit** — a note is a log entry; fix by delete + re-add.
4. (Default, named) **No target-existence check** — the id always comes from the page you're on; we
   validate it's a well-formed id, not that the entity still exists.

## 4. Plan
### Data model (`Note`)
```
author:     string           // staff email
body:       string (1–2000)
targetType: 'order' | 'product' | 'inventory' | 'general'
targetId?:  ObjectId         // the order / product / variant id; absent for 'general'
timestamps
index: { targetType, targetId, createdAt }
```

### Backend
- `models/note.ts` — schema above.
- `lib/noteInput.ts` — zod create-schema (testable): body length; `refId` required + valid when the
  type isn't general.
- `permissions.ts` — new `notes.manage`, granted to owner **and** manager.
- `routes/notes.ts` (mounted `/api/admin/notes`, behind admin auth):
  - `GET /?type=&refId=` — notes for an entity / a type / all, newest first.
  - `POST /` — create.
  - `DELETE /:id` — author-or-owner only.
- `index.ts` — mount the notes router before the general `/api/admin` mount.

### Frontend
- `types.ts` — `Note`.
- `lib/api.ts` — `adminApi.notes.list/create/remove`.
- `components/Notes.tsx` — reusable widget (list + add + delete) for one target.
- Embed on **order detail** and **product edit**; add a per-row **notes toggle** on **inventory**.
- New **`/admin/notes`** page (+ nav link): filter by kind, add general notes, each note links to its
  entity.

**Not touching:** price/stock/order/payment logic; customer-facing pages.

### Rejected
- Note edit (YAGNI). Target-existence validation (id comes from a real page). A new role (reuse the
  two roles + one permission).

## 5. Tasks
- [x] `models/note.ts`
- [x] `lib/noteInput.ts`
- [x] `permissions.ts` — `notes.manage`
- [x] `routes/notes.ts` + mount in `index.ts`
- [x] test — note input validation
- [x] `types.ts` + `lib/api.ts` — Note + adminApi.notes
- [x] `components/Notes.tsx`
- [x] embed on order / product / inventory
- [x] `/admin/notes` tab + nav
- [x] typecheck (both) + tests clean (52 tests, 51 pass, 1 skip)
- [x] walkthrough (section 7)

## 6. Updates
- **2026-10-19** — Spec written; inline + tab, author-or-owner delete approved. Build starting.
- **2026-10-19** — Built and verified. Backend: `Note` model, `noteInput` zod schema, `notes.manage`
  permission (owner + manager), `routes/notes.ts` (GET/POST/DELETE) mounted at `/api/admin/notes`
  before the general admin mount. Frontend: reusable `<Notes>` widget on order detail, product edit,
  and a per-row toggle on inventory; new `/admin/notes` tab (filters + general notes) + nav link.
  Both typecheck clean; note-input test 4/4; full suite 51 pass / 0 fail.
- **2026-10-19** — Test hygiene (found while running the suite): now that a real Resend key is in
  `.env`, order-confirmation emails were firing real API calls during tests. Added `NODE_ENV=test`
  short-circuit in `sendEmail` and a `tests/setup.ts` preload (wired into `npm test`) so tests never
  touch the network.

## 7. Explanation

### 1. What changed
The owner can write **notes** in the admin and tag each to an **order**, a **product**, an
**inventory variant**, or leave it **general**. Notes show up right where he works (on those pages)
and in a new **Notes tab** that lists everything with filters.

### 2. Why it was needed
So the owner stops memorising ("call this customer", "reorder this size", "this product runs small").

### 3. How it works, step by step
1. Each screen with a single entity mounts a reusable `<Notes type refId>` widget. Inventory rows have
   a "Notes" toggle that opens the widget for that variant.
2. The widget calls `GET /api/admin/notes?type=&refId=` to list, `POST` to add, `DELETE` to remove.
3. Every call is behind the admin session **and** the new `notes.manage` permission (owner + manager).
4. On create, the server stamps the **author** from the signed-in staff — the client can't spoof it.
5. Delete is allowed only for the **author or the owner** (checked server-side).
6. The `/admin/notes` tab lists all notes (filter by kind), lets you add **general** notes, and links
   each tagged note back to its order/product/inventory screen.

### 4. Files / functions changed
- **Backend:** `models/note.ts` (schema + index), `lib/noteInput.ts` (zod create-schema),
  `lib/permissions.ts` (`notes.manage` on both roles), `routes/notes.ts` (list/create/delete),
  `index.ts` (mount). `lib/email.ts` + `tests/setup.ts` + `package.json` (test-env email skip).
- **Frontend:** `lib/types.ts` (`Note`, `NoteType`), `lib/api.ts` (`adminApi.notes`),
  `admin/components/Notes.tsx` (widget), order-detail / product-edit / inventory integrations,
  `admin/notes/page.tsx` (tab), `AdminShell.tsx` (nav), `globals.css` (styles).

### 5. Important decisions
- **One permission, both roles** — notes are a shared operator tool; no new role.
- **Author stamped server-side; delete is author-or-owner** — a manager can't wipe the owner's notes.
- **No edit, no target-existence check** — a note is a log entry (delete + re-add); the id always
  comes from a real page (we validate its format only). Both marked as deliberate corners.

### 6. Tests / verification
- Backend typecheck clean; `npm test` → 52 tests, 51 pass, 1 skip, 0 fail (incl. 4 new note-input).
- Frontend typecheck clean.
- **Not run:** a live browser click-through — owner to confirm (sign in → add/delete a note on an
  order, a product, an inventory row, and the Notes tab).

### 7. Edge cases and limitations
- **Orphan notes:** if the tagged order/product/variant is later deleted, its notes remain (no cascade).
  Harmless; a cleanup/cascade is a later concern if it ever matters.
- **Inventory links** go to the inventory list (there's no single-variant page).
- **No pagination** — capped at 200 newest per view; fine for this shop's volume.
