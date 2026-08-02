---
title: Best-Form Clone — Problems Ledger (what we refuse to clone, with receipts)
domain: CODEREF-CORE
status: open
created: 2026-08-02
stub_ref: null
---

# Problems Ledger — clone the features, not these

Eight defect classes, each observed (not hypothesized) in this ecosystem, each mapped to the blueprint element that makes recurrence structural nonsense rather than a matter of discipline. Receipts cite workorders, tickets, kaizen entries, commits, and live measurements from the 2026-08-02 session. Provenance: operator session ledger + this repo's registry/archives + tonight's `orient`/`cycles`/map run.

---

## P1 — Seam disagreement: two components, no seam test

The dominant class of the whole program era. Instances:

- Header **generator vs parser round-trip asymmetry** for hash headers — parse-side coverage was 21.7% of what generate emitted until WO-FIX-GENERATOR-PARSER-ROUND-TRIP-ASYMMETRY-FOR-HASH-001 (core `a4f333e..10e50fc`) took it to 100%.
- **Transparent frames**: element-extractor emits arrow functions as elements, but the raw-call extractor didn't descend into them — invisible to the entire suite (WO-RESOLVE-62 trap ledger, `5fbe723`).
- **`import type` short-circuited classification** before external/builtin tiering (same WO — the fix is "use importOriginOf", i.e., one classifier).
- Culture side, same shape: culture-lib ignores registry `path` while align/run.mjs honors it (TKT-0QTKY6, unfixed at close of the ElementExtractor-revisits WO, whose close report named this exact pattern: "one defect class throughout = two components disagree and nothing tested the seam").

**Countermeasure:** the Contracts band. One codec per artifact (L1) with round-trip property tests; one traversal all extractors ride (L2). A seam is now a package with tests, not an implicit agreement.
**Blueprint:** `contracts.*`, `engine.extract`, `engine.resolve`.

## P2 — Duplicated surfaces kept in parity by hand

- **TWO adjacency indexes** (canonical-graph + mcp/graph-tools) that must both learn every new edge kind — documented as a standing gotcha in the API-surface mapping WO.
- **MCP vs CLI mirrors**: an entire WO phase existed just to restore parity (genre-extraction P6, 5 tools), plus a CLI-mirror dedup follow-up (`d3f60be`); the reference prep's own discovery independently found "minor discrepancies in how graph paths, cycle detections, and symbol lookups are computed across CLI commands versus MCP tools".
- Live signal tonight: `cli/mcp/verify-tools.ts` fan-out 111 and `graph-tools.ts` fan-out 98 — query logic living inside adapters.

**Countermeasure:** `engine.api` is the only implementation; transports are schema-map + call (L4); one adjacency index (L3). Parity is not tested into existence — it's the absence of a second copy.
**Blueprint:** `engine.api`, `transport.*`, L3/L4.

## P3 — Monolith accretion and layer erosion

- mcp-server monolith reached **3,998 lines** before the decompose WO brought it to 1,087; orchestrator reached ~1,029 with `run()`/`runIncremental()` duplicating resolution logic (decouple WO took it 1,029→700; the prep's discovery flags the same file).
- `shared.ts` with 26 exports coupling all tool families (prep discovery).
- Cycles crept to 2 pre-decompose; tonight the repo carries 3 (see P6 for what two of them are).

**Countermeasure:** deny-by-default imports derived from the blueprint (L5) — accretion requires editing the blueprint in review, not just adding an import; cycles pinned at 0 (L9); drift check (`verify.drift`) makes shape erosion visible every build.
**Blueprint:** `verify.rules`, `verify.drift`, L5/L9.

## P4 — Dishonest or unmeasured numbers

- `unresolved_src_count` is `!testOrigin` with **no build-output exclusion** (output-validator.ts:653) — `.coderefignore` is its only defense; an entire family of headline figures (62% / 10,691 / 5,050 / 2,137 / 1,788 / 1,203) went **dead** while still being quoted, vs the honest 813/547 accounting.
- Ghost index entries (`types.d.ts`, `scanner.js`) surfaced during MCP-server dogfooding.
- The **stale-dist trap**: tests build main tsconfig while the CLI builds `tsconfig.cli.json` (KZ-01KXSN2H) — green suite, stale binary.
- Live tonight: the vector index has been **silently stale since 2026-07-20** while the code index moved to 2026-08-02 — only `orient` warns.

**Countermeasure:** `engine.measure` owns every published denominator and exclusion at the source; `contracts.envelope` makes staleness/provenance a required block on every artifact and response — readers must distinguish empty from unknown (L7); `verify.fixture` pins counts to hand-verified truth; `verify.parity` adjudicates every difference in writing.
**Blueprint:** `engine.measure`, `contracts.envelope`, `verify.fixture`, `verify.parity`.

## P5 — Path fragility on Windows

- indexing-orchestrator path normalization **fails on Windows** (AC-09, STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001).
- Scheme-prefixed registry `path` values break path-joining helpers (API-surface WO gotcha).
- `layers.json` resolution crashed from nested subdirs until made cwd-independent (STUB-W8S124, `ed5d7e3`).
- Live signal: `normalizeSlashes` fan-in **146** — one hundred forty-six call sites individually remembering to normalize.

**Countermeasure:** `contracts.paths` branded RepoPath — repo-relative POSIX, constructed only at boundaries; raw strings die at the loader (L6). Windows is a first-class CI target, not the surprise environment.
**Blueprint:** `contracts.paths`, L6.

## P6 — Engine / presentation / process entanglement

- Doc generation, viewer assets, exporters, and context packing live inside the analysis engine (the reference prep's core thesis — agreed and adopted).
- **Live receipt from tonight's scan: 2 of the repo's 3 call cycles are `viewer.js` files under `coderef/working/`** — planning-folder HTML polluting the engine's own self-graph. The registry side once hit 209MB. Scan scope is defended only by ignore files.
- Cross-band entanglement measured at the directory level: **3,072 of 3,544 aggregated dependency weight crosses target-band boundaries** (see as-is.html).

**Countermeasure:** four-band split; allowlist-first scan scope in `engine.loader` (L8) so pollution is impossible rather than ignored; surfaces import contracts only; process/planning machinery stays out of the engine repo entirely.
**Blueprint:** `engine.loader`, `surface.*`, L8; `as-is.html` is the routing table for the unwind.

## P7 — RAG coupled to headers

- The RAG path was **unusable on header-less repos** (PS rescan finding; headerless-fallback logged as follow-up).

**Countermeasure:** `engine.rag` joins on `contracts.index` element identity; headers are optional enrichment (`engine.headers`), never a precondition.
**Blueprint:** `engine.rag`, `contracts.rag`.

## P8 — Config and build sprawl

- Dual tsconfigs caused the stale-dist trap (P4); scan-scope truth is split across `DEFAULT_EXCLUDE_PATTERNS`, `.coderefignore`, and per-tool options; `standards-validate` silently skips without `--domain`/`--project-root` (KZ-01KXSNQ6 class).

**Countermeasure:** one build config per package; one scan-scope owner (`engine.loader`); configs that govern artifacts live beside those artifacts' schemas.
**Blueprint:** `engine.loader`, `contracts.envelope`, L8.

---

## How the ledger is used

Every blueprint node carries a `neutralizes` list referencing these ids (visible in each graph's detail panel). During the build, a task that touches a node inherits its problem list as review checklist items; `verify.parity` adjudication cites this file when a count difference is ruled improvement-vs-bug. If a ninth class is discovered during the build, it gets a P-id here **and** a structural countermeasure in the blueprint before work continues — the ledger and the graph move together.
