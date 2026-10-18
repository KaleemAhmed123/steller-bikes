# Raju Cycles — project rules for Claude

Online store **and** back-office for a real cycle shop in Kanpur, UP, India. **One idea:**
a store the owner can actually run and *maintain* — boring, lean, on a stack a normal Node
developer knows. The server is the authority on prices and stock; the admin is permission-gated.

Full context: [`docs/specs/storefront-rebuild/`](docs/specs/storefront-rebuild/) — start at
`context/00-overview.md`, then `scaffold.md` for the first-code plan.

## HARD RULES — explain-and-wait

These outrank everything below. The user is the owner/tech-lead managing this project, not deep
in web jargon.

1. **Explain in the plain, teaching style.** Simple words, point form, a one-line meaning for every
   technical term the first time it appears, a why-it-matters for every choice, small worked
   examples / diagrams where they help. No jargon dumps, no throat-clearing.
2. **Plan first, then wait.** For anything beyond a one-line fix: restate the task, write the plan,
   list open questions (each with a recommended answer), and **wait for an explicit go** before
   touching code. An open question on the table means stop — no "I'll just start the easy part".
3. **End every substantial reply with three headings:** *What I achieved* · *What I need from you* ·
   *Next steps* (numbered).
4. **Always surface what the USER must do from their side** — accounts to create (MongoDB Atlas,
   Razorpay, email sender, host), values to set, testing to run — and which boring, low-risk tasks
   could go to a junior dev vs. stay with the owner.

## Ponytail — build the least that works

- Stop at the first rung that holds: does it need to exist? already here? stdlib/native? one line?
  then the smallest code that works.
- **No unrequested abstractions.** No library for what a few lines do. Boring over clever.
- If a dependency or layer can't say why it's here in one line, cut it.
- Mark any deliberate corner-cut with a `ponytail:` comment naming the ceiling and the upgrade path.

## Spec-driven — the spec is written before the code

- All planning lives under [`docs/specs/`](docs/specs/), apart from the app's own docs.
- One task = one folder: `README.md` (index) + `context/` (living docs) + `scaffold.md` (first-code
  plan) + `build-step-N.md` (per-phase write-ups). **Append, never rewrite history** — changes get
  a dated entry in the Updates log.
- Sections 1–5 of a task (task, asked-for, open questions, plan, checklist) land before/with the
  code; the plain-English walkthrough lands in the same change that finishes the work.

## The playbook is the home for commands

[`playbook.md`](playbook.md) (root) is the single source for every command, env value, and run/demo
step. When something operational changes, update `playbook.md` in the **same** change. In replies,
point to it rather than re-pasting long command lists.

## Updating the context docs — ask first

After a big task, don't silently rewrite `docs/specs/storefront-rebuild/context/**`. Say what's now
stale and **ask** before a wholesale refresh. Small inline fixes to a doc you're editing are fine.

## Don't

- Don't trust the client for prices, totals, or stock — the server recomputes everything.
- Don't let stock oversell or a checkout double-charge — those paths use a transaction + a guard.
- Don't add a dependency for something a few lines of code cover.
- Don't put real customer data in seeds or tests — fake everything.
