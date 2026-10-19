# Admin notes

Free-text notes the owner/staff can write and **tag** to an order, product, inventory variant, or
leave general — so he stops memorising. Admin-only; the server is the authority.

| Section | Where |
|---------|-------|
| Plan, open questions, checklist, walkthrough | [`build-step-1.md`](build-step-1.md) |

## Status

**In progress** — started 2026-10-19.

## One-line summary

A `Note` model (author + body + target), admin-only CRUD at `/api/admin/notes` behind a new
`notes.manage` permission (owner + manager), a reusable `<Notes>` widget embedded on the order,
product, and inventory screens, plus a `/admin/notes` tab for general notes and an overview.

## Roadmap after this (owner, 2026-10-19)

1. **Payments tab** in admin.
2. **Proper dashboard** (last).

Then: deploy → production hardening → audit → webhook.
