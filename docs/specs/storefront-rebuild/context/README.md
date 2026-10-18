# Raju Cycles — Project Context

> **Living doc.** The shared mental model for the Raju Cycles rebuild — written so an AI agent gets
> the full picture and a new teammate or the owner can follow what it is and why it's shaped this
> way. Nothing is built yet; this describes the target.
>
> **What it is, in one line:** an online store for a cycle shop in Kanpur, plus an owner back-office
> to run it — rebuilt on React + Node/Express + MongoDB, carrying the proven design from the v1
> prototype.

Read in order the first time; jump by topic after.

| # | File | What it answers |
|---|------|-----------------|
| 00 | [overview](00-overview.md) | What we're building, the one idea, the stack and why each piece earns its place, the glossary. **Start here.** |
| 01 | [domain-and-data](01-domain-and-data.md) | The data model ported from v1, as MongoDB collections; MVP-now vs. deferred. |
| 02 | [decisions](02-decisions.md) | Locked decisions (dated) and the open questions still on the table. |

**The one idea that explains everything:** *the server is the authority on price and stock; the
admin is permission-gated; build the least that works.*

See also: [`../scaffold.md`](../scaffold.md) · [`../README.md`](../README.md) ·
[`../../../../playbook.md`](../../../../playbook.md).
