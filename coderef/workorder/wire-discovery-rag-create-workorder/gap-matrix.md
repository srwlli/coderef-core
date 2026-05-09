# Gap Matrix — WO-WIRE-DISCOVERY-RAG-CREATE-WORKORDER-001

**Phase 1 verification completed: 2026-05-09T05:10:00Z**
**Auditor: execute-workorder skill (Claude Sonnet 4.6)**

---

## Contract Items from SKILL.md Step 3.6

| # | Contract Item | Current Status | Action Required in Phase 2 |
|---|---|---|---|
| C-01 | `CODEREF_LLOYD_DISCOVERY_RAG` env var feature flag check (os.getenv) | **WIRING NEEDED** | Step 3.6 already specifies this in SKILL.md but no reference doc exists to enforce the exact code path. RAG-DISCOVERY-STEP.md must be written. |
| C-02 | Pre-flight `/coderef-rag-server status` health check before calling enrich_with_rag() | **WIRING NEEDED** | Specified in SKILL.md Step 3.6 ¶Infrastructure prereq. Not yet documented as a reference contract agents can follow step-by-step. RAG-DISCOVERY-STEP.md covers this. |
| C-03 | Import `enrich_with_rag` from `SKILLS.WORKFLOW._shared.planner.discovery_rag` | **DONE** | Module exists and imports cleanly (verified T1.3). Import path correct. |
| C-04 | Call signature: `enrich_with_rag(goal, project_dir, target_root=<target>)` | **DONE** | Actual signature: `enrich_with_rag(goal, project_dir, target_root=None, rag_endpoint=..., rag_freshness_days=...)`. Matches Step 3.6 call contract exactly. |
| C-05 | Return shape: `{hits, rewrote_query, lloyd_provenance, fallback_used, error, ms}` | **DONE** | Confirmed in discovery_rag.py (T1.1). All 6 fields present. |
| C-06 | Graceful fallback: `fallback_used=true` on vectors_stale or Lloyd unreachable — workorder must not block | **DONE** | discovery_rag.py implements this correctly — returns early with fallback_used=true, empty hits, continues. |
| C-07 | If disabled or no RAG hits: set `discovery_rag = {"hits": [], "fallback_used": None}` or omit | **WIRING NEEDED** | Must document exact behavior when flag=OFF in RAG-DISCOVERY-STEP.md. SKILL.md says "omit if OFF" but agents need the exact contract. |
| C-08 | Persist `discovery_rag` to context.json under `classification.discovery_rag` key (all required fields) | **WIRING NEEDED** | SKILL.md §Step 4.5 specifies the schema (rag_hits, lloyd_provenance, fallback_used, error, ms, discovery_rag_timestamp, discovery_rag_enabled). RAG-DISCOVERY-STEP.md must document the full persistence schema. |
| C-09 | `discovery_rag_timestamp: ISO timestamp` in context.json | **WIRING NEEDED** | Part of C-08 persistence schema. Not yet enforced by any reference doc. |
| C-10 | `discovery_rag_enabled: bool` in context.json | **WIRING NEEDED** | Part of C-08 persistence schema. Not yet enforced by any reference doc. |
| C-11 | skill.json `reads[]` includes `discovery_rag.py` | **MISSING** | skill.json reads[] does NOT include discovery_rag.py. It IS in depends_on[]. T2.2 adds it to reads[]. |
| C-12 | `RAG-DISCOVERY-STEP.md` reference doc exists at `references/RAG-DISCOVERY-STEP.md` | **MISSING** | File does not exist. SKILL.md Step 3.6 ends with "See references/RAG-DISCOVERY-STEP.md for the full contract." The reference is broken. T2.3 creates it. |

---

## Summary

| Status | Count | Items |
|---|---|---|
| DONE | 4 | C-03, C-04, C-05, C-06 |
| WIRING NEEDED | 6 | C-01, C-02, C-07, C-08, C-09, C-10 |
| MISSING | 2 | C-11, C-12 |

**DONE items** require no code changes. They confirm discovery_rag.py is complete, callable, and behaves correctly.

**WIRING NEEDED items** (C-01, C-02, C-07, C-08, C-09, C-10) are all addressed by creating `RAG-DISCOVERY-STEP.md` (T2.3) — the reference doc that agents follow to execute Step 3.6. Once the reference doc exists and skill.json reads[] is updated, the wiring is complete.

**MISSING items** (C-11, C-12) have direct Phase 2 tasks: T2.2 (skill.json) and T2.3 (RAG-DISCOVERY-STEP.md).

---

## Phase 1 Verification Results

| Check | Result | Details |
|---|---|---|
| discovery_rag.py importable from ASSISTANT context | PASS | `from discovery_rag import enrich_with_rag` succeeds; urllib3 version warning benign |
| enrich_with_rag() signature matches Step 3.6 contract | PASS | Exact match on all positional + keyword args |
| /coderef-rag-server status command available | PASS | `coderef-rag-server status` documented; outputs healthy + index size + uptime |
| skill.json reads[] includes discovery_rag.py | FAIL (gap) | Not present in reads[]; IS in depends_on[] — T2.2 fixes |
| RAG-DISCOVERY-STEP.md exists | FAIL (missing) | File absent; broken SKILL.md reference — T2.3 creates |
| CODEREF_LLOYD_DISCOVERY_RAG env var wired in execution layer | PENDING | No explicit enforcement exists; RAG-DISCOVERY-STEP.md + skill.json fix addresses via contract |

---

## Phase 2 Action Plan

1. **T2.2** — Add `SKILLS/WORKFLOW/_shared/planner/discovery_rag.py` to `skill.json` reads[]. One-line edit.
2. **T2.3** — Write `references/RAG-DISCOVERY-STEP.md`. Full Step 3.6 contract: feature flag, pre-flight, call signature, fallback, context.json persistence schema. This is the primary deliverable.
3. **T2.4** — Test flag=OFF (discovery_rag absent from context.json) and flag=ON+vectors_missing (fallback_used=true, no block).
4. **T2.5** — Commit all changes.

**Phase 2 gate passed.** All contract items classified. No blocking unknowns. Phase 2 may proceed.
