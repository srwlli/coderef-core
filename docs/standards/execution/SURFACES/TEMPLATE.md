---
title: "Executor Surface Spec: {FILL: SurfaceName}"
status: living
updated: {FILL: YYYY-MM-DD}
kind: execution
surface: {FILL: e.g. entity-generator | index-apply | export-writer}
---

<!-- Authored by /standards-establish from SKILLS/STANDARDS/kinds/execution/template/SURFACES/TEMPLATE.md.
     This is the PROJECT's standard for the "execution" kind. Edit to fit the project;
     re-run /standards-update when the ecosystem template evolves. -->

<!-- PROVENANCE: rendered from standard-KIND `execution`
     (SKILLS/STANDARDS/kinds/execution/template/SURFACES/TEMPLATE.md).
     Copy this per executor surface into standards/execution/SURFACES/<SurfaceName>.md
     and fill every {FILL}. A rule change is a KIND change — edit the template and
     re-sync via /standards-update --kind=execution. The FILLED docs are project
     content. REMEMBER THE DEFINING INVARIANT: each section ROUTES to the authority
     that owns its rule (a pointer / link) — it does NOT restate the rule prose. -->

# Executor Surface Spec: {FILL: SurfaceName}

> The authoritative per-surface reference for `{FILL: SurfaceName}`: how it
> generates, what contract its output must satisfy, where its artifacts live, and
> how its writes are rehearsed + verified. An agent about to run, extend, or debug
> this surface reads THIS instead of re-discovering the write loop. Grounded in the
> four execution sub-types.
>
> **ROUTE, do not restate:** each section below POINTS to the authority that owns
> its rule (a `see:`/`authority:` line or a link). Do not paste the authority's rule
> text here — link to it. The checker FAILs a section that carries rule prose without
> a pointer.

## 1. What it is

{FILL: one-paragraph definition — what this executor surface produces/writes and the
boundary that separates it from adjacent surfaces. Name the real generator/writer
code and the artifacts it emits.}

## 2. Generation (generation sub-type)

- **Output format:** {FILL: the one stable shape every artifact/id this surface emits gets.}
- **Reproducible inputs:** {FILL: the permanent facts the output derives from; confirm no random/timestamp/scan-order/absolute-path leaks into the pinned output.}
- **Refuse-to-emit condition:** {FILL: when a required input is absent, what the generator does instead of emitting a guess.}
- **Determinism note:** {FILL: confirm same inputs → same artifact on every run/surface; cite the shared generator helper.}
- **Authority (ROUTE):** {FILL: `see:` / link to the generator/keying authority that owns the rule. Do NOT restate the ladder/format here.}

## 3. Contract (contracts sub-type)

- **Authoritative contract:** {FILL: the schema/contract this surface's artifacts are validated against — link to the contract file, do not paste it.}
- **Validate-before-accept:** {FILL: where/when validation runs before the artifact is accepted or committed.}
- **Governing rulings:** {FILL: the locked contract decisions that apply here. Or `N/A`.}
- **Authority (ROUTE):** {FILL: `see:` / link to the schema/contract authority.}

## 4. Topology (topology sub-type)

- **Artifact classes:** {FILL: the named output artifact classes this surface produces.}
- **Canonical path resolver:** {FILL: how each artifact's canonical location is COMPUTED from stable facts — cite the resolver; confirm no two artifacts collide.}
- **Authority (ROUTE):** {FILL: `see:` / link to the topology/entities authority.}

## 5. Write-discipline (write-discipline sub-type)

- **Rehearse:** {FILL: how a write is dry-run / diff-previewed before it lands.}
- **Reconcile:** {FILL: how the rehearsed write is checked against its contract (§3) + topology (§4).}
- **Commit:** {FILL: the commit step and its preconditions.}
- **Independent verify:** {FILL: the SEPARATE read that proves the write landed (read-back / re-scan), distinct from the write itself.}
- **Authority (ROUTE):** {FILL: `see:` / link to the provenance / write-discipline authority.}

## 6. Related surfaces

{FILL: links to sibling SURFACES/<Other>.md specs this surface feeds or depends on.
Or `N/A`.}

## 7. Change history

{FILL: dated one-line notes on generation/contract/topology/write-loop changes to
this surface.}
