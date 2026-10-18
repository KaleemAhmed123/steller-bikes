# Third-party assets register

Every asset brought into the repo from outside, with its source and licence. Keep this current:
anything added to `frontend/public` from an external source gets a row here before it ships.

## 3D models

| File | What | Source | Author | Licence | Attribution required? |
|------|------|--------|--------|---------|-----------------------|
| `frontend/public/models/bicycle.glb` | Low-poly bicycle (hero conceptual brand visual — **not** a real catalogue SKU) | [Poly Pizza](https://poly.pizza/m/19VoUuA2pcN) (model id `19VoUuA2pcN`, file `6048701b-fa87-426b-9242-c786ca25fa3a.glb`) | **Poly by Google** | **CC-BY 3.0** | **Yes** |

**Required attribution (CC-BY 3.0):** "Bicycle" by Poly by Google, licensed under
[CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [Poly Pizza](https://poly.pizza/m/19VoUuA2pcN).

This attribution is surfaced to users in the storefront footer ("Credits") so the CC-BY requirement
is met on the live site, not only in this file.

### Notes

- The hero bicycle is a **conceptual brand visual**. It is never presented as a purchasable product
  or tied to a real SKU, per the brief.
- Model is ~2.4 MB (texture-heavy, `obj2gltf`-generated, single mesh/material). It is **lazy-loaded**
  inside a client-only canvas, so it never blocks first paint or the shopping content.
- **Future optimisation (not done this pass):** Draco/meshopt compression + texture resize could cut
  the ~2.4 MB considerably. Skipped to avoid adding build tooling; revisit if hero load is slow on
  mobile.

## Images

The three existing product photos (`public/images/*.jpg`) predate this pass and are unchanged.
No new external imagery was added; sample products reuse these three photos (clearly labelled sample
data) rather than hotlinking or inventing imagery.
