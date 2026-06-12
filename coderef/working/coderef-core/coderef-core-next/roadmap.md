# Roadmap: coderef-core-next

**Owner:** CODEREF-CORE
**Created:** 2026-06-12T12:20:00Z
**Updated:** 2026-06-12T23:49:46Z
**Current phase:** 2
**Render slug:** `SURFACES/surfaces-html/renders/roadmap/coderef-core-next/` (stable, no ULID)

---

## Phase 1: Native intelligence surface (in flight)

**Status:** complete
**Hard-stop:** yes
**Gating predicate:** WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 lands on main and is pushed; team notified; ASSISTANT registers MCP domain coderef-core
**Shipped commit:** 79605fa

### Items

- [medium] **STABILIZE** undefined — *open*
- [medium] **LOCAL-FIRST-RAG** undefined — *open*
- [medium] **MCP-SERVER-V1** undefined — *open*
- [medium] **DOCS-DRIFT-SWEEP** undefined — *open*
- [medium] **LAND-NOTIFY** undefined — *open*

---

## Phase 2: Correctness debt

**Status:** active
**Hard-stop:** no
**Gating predicate:** Phase 1 landed on main

### Items

- [medium] **INTEL-SERVER-SCHEMA** undefined — *open*
- [medium] **UNRESOLVED-EDGE-AUDIT** undefined — *open*
- [medium] **WIN-PATH-NORMALIZATION** undefined — *open*

---

## Phase 3: Storage and footprint

**Status:** not_started
**Hard-stop:** no
**Gating predicate:** Phase 1 landed; STUB-BQDXJ0 design accepted

### Items

- [medium] **REGISTRY-RAWFACTS-DEDUP** undefined — *open*
- [medium] **VECTOR-STORE-PATH-FIX** undefined — *open*

---

## Phase 4: MCP server v2 tools

**Status:** not_started
**Hard-stop:** no
**Gating predicate:** MCP-SERVER-V1 shipped; INTEL-SERVER-SCHEMA ruling made (hotspots tool replaces or wraps intelligence-server)

### Items

- [medium] **TOOL-HOTSPOTS** undefined — *open*
- [medium] **TOOL-CYCLES** undefined — *open*
- [medium] **TOOL-WHAT-EXPORTS** undefined — *open*
- [medium] **TOOL-DIFF-IMPACT** undefined — *open*
- [medium] **TOOL-RAG-SEARCH** undefined — *open*

<!-- depends_on: PHASE-1.MCP-SERVER-V1 -->

---

## Phase 5: RAG quality

**Status:** not_started
**Hard-stop:** no
**Gating predicate:** Local-first RAG shipped; a golden-query eval harness exists before any ranking change lands

### Items

- [medium] **EVAL-HARNESS** undefined — *open*
- [medium] **CHUNK-ENRICHMENT** undefined — *open*
- [medium] **PROVENANCE-RANKING** undefined — *open*
- [medium] **INDEX-FRESHNESS** undefined — *open*

---

## Load-bearing chronology callouts

- **undefined** [undefined]: undefined
- **undefined** [undefined]: undefined
- **undefined** [undefined]: undefined
- **undefined** [undefined]: undefined

