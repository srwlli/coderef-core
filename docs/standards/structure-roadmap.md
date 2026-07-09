---
kind: structure-roadmap
title: Roadmap-Vision Binding Standard
status: living
updated: 2026-07-07
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/structure-roadmap/template/structure-roadmap.md.
     This is the PROJECT's standard for the "structure-roadmap" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

# Roadmap-Vision Binding Standard

> **Kind:** `structure-roadmap` · **Registry:** `SKILLS/STANDARDS/kinds/`
> This is the ecosystem TEMPLATE an agent authors a project's roadmap-binding
> standard FROM (via `standards-establish`). The authored output lives at the
> project's `docs/standards/structure-roadmap.md`, where the project DECLARES
> its roadmap homes and vision docs. The enforceable twin is `check.mjs`; the
> drift surfacing layer is the roadmap-vision alignment audit.

A **vision** is the destination — what we're building and why, in human words,
owned by the operator. A **roadmap** is the route — the phased, mechanical path
toward that destination. This kind enforces the BINDING between the two: every
live roadmap must say which vision goal it routes to and how we will know it has
arrived. An unbound roadmap is a route to nowhere — it cannot drift because
nothing pins where it was going.

## THE BINDING — three required fields on every live roadmap.json

| field | shape | rule |
|---|---|---|
| `vision_ref` | string (relative path) | resolves to the governing vision doc — roadmap-dir-relative first, then project-root-relative; a dangling ref FAILs |
| `vision_goal` | non-empty string | names the specific goal in the vision doc this roadmap routes to |
| `completion_predicates` | non-empty array of strings | observable done-conditions; when ALL hold, the roadmap is complete and must be closed |

Terminal-status roadmaps (`complete`, `archived`, `superseded`, ...) are exempt
from the core binding checks — binding is a live-route obligation, not a
retroactive record requirement. A roadmap with no `status` field is assumed live.

Example binding block inside a `roadmap.json`:

```json
{
  "project": "my-initiative",
  "status": "active",
  "vision_ref": "../VISION.md",
  "vision_goal": "Operators steer the ecosystem from one canonical dashboard",
  "completion_predicates": [
    "The dashboard renders live registry state with zero manual refresh steps",
    "Every agent domain reports status through the dashboard, not terminal chat"
  ],
  "phases": []
}
```

## THE DRIFT TAXONOMY (what the alignment audit classifies)

| class | meaning | detected by |
|---|---|---|
| **structural** | the binding itself is missing or broken (absent field, dangling `vision_ref`) | `check.mjs` (core FAIL) + audit |
| **temporal** | the roadmap's declared state lags its git history (stale `updated` stamp, active roadmap untouched for a long interval) | alignment audit (needs git) |
| **semantic** | destination and route disagree — the vision goal is marked done (`[x]`, `DONE`, `COMPLETE`, `SHIPPED`) while the roadmap is still open | alignment audit (needs vision semantics) |

## How a project DECLARES its roadmap estate

In `docs/standards/structure-roadmap.md`, fill this table:

| role | location |
|---|---|
| roadmap home(s) | {where roadmap.json files live, e.g. `coderef/working/<initiative>/`} |
| vision doc(s) | {where visions live, e.g. root `VISION.md`, per-domain `VISION.md`} |
| audit cadence | {when the alignment audit runs, e.g. on /update-roadmap + weekly} |

The checker discovers `roadmap.json` files generically under the project root;
the declaration makes the homes discoverable to humans and agents, not just to
the walker.

## Conformance (what `check.mjs` verifies)

PASSES when: every live roadmap.json parses, declares a resolvable `vision_ref`,
a non-empty `vision_goal`, and a non-empty `completion_predicates` array. Module
checks WARN when a bound `vision_goal` does not match any heading/goal line in
its vision doc (wording drift) or when a roadmap omits `status`. Temporal and
semantic drift are the audit's job — `check.mjs` stays portable and git-free.

---

*Authored from `SKILLS/STANDARDS/kinds/structure-roadmap/template.md` v1.0.0.*
