# author_wo.py — /create-workorder authoring pass for WO-REPO-REVIEW-2026-07-REMEDIATION-001
# Rolling-plan promotion of STUB-W45PTN (Phase 1 = P0) with deferred phases bound to
# STUB-XG7DSB (P1 structural) and STUB-01DW28 (P2 perf/hygiene). Operator ruling (A), 2026-07-02.
import json
import sys
import datetime
from pathlib import Path

ASSISTANT = Path(r"C:\Users\willh\Desktop\CODEREF\ASSISTANT")
CORE = Path(r"C:\Users\willh\Desktop\CODEREF\CODEREF-CORE")
WO_DIR = CORE / "coderef" / "workorder" / "repo-review-2026-07-remediation"
sys.path.insert(0, str(ASSISTANT / "SKILLS" / "WORKFLOW" / "_shared"))

from planner import create_plan
from planner.discovery import run_discovery
from planner.discovery_rag import enrich_with_rag
from planner.validate import validate_plan

WO_ID = "WO-REPO-REVIEW-2026-07-REMEDIATION-001"
FEATURE = "repo-review-2026-07-remediation"
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

GOAL = (
    "Remediate the 2026-07-02 code-first repo review of coderef-core across three tiers. "
    "Phase 1 (P0 correctness and trust): fix coderef-query missing analyze() call; gate the hollow "
    "breaking-change detector; make RAG incremental indexing state record only successful embeds and "
    "wire chunksToDelete to vectorStore.delete(); add .coderef/** to scanner DEFAULT_EXCLUDE_PATTERNS "
    "and remove committed residue; replace hardcoded machine paths in coderef-watch and "
    "coderef-rag-server; fix the two failing vitest tests for a green baseline. "
    "Phase 2 (P1 structural, deferred): legacy analyzer/query stack retirement per DR-PHASE-5-C, "
    "tree-sitter TS relationship extraction, strict tsconfig migration, shared provider/store factory, "
    "coderef-search fix-or-drop, centralized path normalization. "
    "Phase 3 (P2 perf and hygiene, deferred): single-parse scan pipeline, dead-code deletion, "
    "plugin system wiring, sqlite-vec or atomic vector-store writes."
)

TOUCHES = [
    "src/cli/coderef-query.ts",
    "src/context/breaking-change-detector/diff-analyzer.ts",
    "src/cli/coderef-analyze.ts",
    "src/integration/rag/indexing-orchestrator.ts",
    "src/integration/rag/incremental-indexer.ts",
    "src/scanner/scanner.ts",
    "src/index.ts",
    "src/cli/coderef-watch.ts",
    "src/cli/coderef-rag-server.ts",
    "src/fileGeneration/__tests__/buildDependencyGraph.test.ts",
    "src/scanner/__tests__/ast-mode.test.ts",
]

print("[author] Step 4: discovery ...")
discovery = run_discovery(str(CORE), GOAL, touches_hint=TOUCHES, plan_type="phased")
print(f"[author]   candidates={len(discovery['candidates'])} blast={len(discovery['blast_radius'])} "
      f"public_api={len(discovery['public_api_hits'])} warnings={len(discovery['warnings'])}")

print("[author] Step 3.6: RAG discovery enrichment (graceful) ...")
try:
    rag = enrich_with_rag(GOAL, str(CORE))
except Exception as e:  # enrichment, not gate
    rag = {"hits": [], "rewrote_query": False, "lloyd_provenance": None,
           "fallback_used": True, "error": f"exception: {e}", "ms": 0}
print(f"[author]   rag hits={len(rag.get('hits') or [])} fallback={rag.get('fallback_used')} error={rag.get('error')}")

semantic_scan = json.loads((WO_DIR / "semantic-scan.json").read_text(encoding="utf-8"))

# ---------------- Step 4.5: context.json ----------------
context = {
    "workorder_id": WO_ID,
    "feature_name": FEATURE,
    "created": NOW,
    "owner_domain": "CODEREF-CORE",
    "target_project": "coderef-core",
    "intake": {
        "trigger": "stub-promotion: /create-workorder --from-stub=STUB-W45PTN --plan-type=strict --phased-stubs",
        "user_request": (
            "Promote STUB-W45PTN (full remediation of the 2026-07-02 code-first repo review) as a "
            "strict-discipline phased workorder covering all three tiers; operator ruling (A) selected the "
            "rolling-plan shape with follow-on stubs minted for the deferred P1/P2 phases."
        ),
    },
    "classification": {
        "plan_type": "phased",
        "plan_type_rationale": (
            "Forced to phased by the --phased-stubs rolling-plan contract (a strict rolling plan is "
            "incoherent per ROLLING-PLAN.md). Stub category 'fix' maps to strict and the user passed "
            "--plan-type=strict; both are logged as overridden. Rolling shape chosen because Phase 1 (P0) "
            "evidence (green baseline, ghost-entry cleanup, STUB-9F63EJ overlap) changes the picture for "
            "the P1 structural tier, so one-shot planning of all 18 items would go stale by Phase 2."
        ),
        "plan_type_decided_by": "create-workorder@2.15.2",
        "discovery_ref": discovery["summary_ref"],
        "discovery": discovery,
    },
    "semantic_scan": semantic_scan,
    "discovery_rag": {
        "rag_hits": rag.get("hits") or [],
        "lloyd_provenance": rag.get("lloyd_provenance"),
        "fallback_used": rag.get("fallback_used"),
        "error": rag.get("error"),
        "ms": rag.get("ms"),
        "discovery_rag_timestamp": NOW,
        "discovery_rag_enabled": True,
    },
    "promotion_metadata": {
        "from_stub": "STUB-W45PTN",
        "phased_stubs": ["STUB-XG7DSB", "STUB-01DW28"],
        "rolling_plan_contract": "references/ROLLING-PLAN.md (create-workorder v2.7.0+)",
        "operator_ruling": "(A) rolling plan — minted STUB-XG7DSB (P1 structural) + STUB-01DW28 (P2 perf/hygiene) as deferred phases, 2026-07-02",
        "stub_context": "coderef/working/repo-review-2026-07-remediation/context.md (P0-1..P0-6, P1-7..P1-12, P2-13..P2-18)",
        "source_report": "coderef/reference/repo-review-2026-07-02.md",
    },
    "scope": {
        "in_scope": [
            "Phase 1 (P0 correctness & trust): coderef-query fix, breaking-changes gating, RAG incremental state + vector deletion, scanner .coderef/** excludes + committed-residue removal, hardcoded-path replacement, 2 failing-test fixes -> green baseline",
            "Phase 2 (P1 structural, plan deferred to STUB-XG7DSB): legacy-stack retirement per DR-PHASE-5-C, tree-sitter TS relationships, strict tsconfig migration, shared provider/store factory, coderef-search fix-or-drop, centralized path normalization",
            "Phase 3 (P2 perf & hygiene, plan deferred to STUB-01DW28): single-parse scan pipeline, dead-code deletion, plugin system wiring, sqlite-vec/atomic vector writes",
        ],
        "out_of_scope": [
            "New features or MCP v2 tool additions (separate roadmap track)",
            "Phase 3 storage roadmap work not named in the review's actionable tables",
            "Semantic-header restamp campaigns and RAG headerless-fallback follow-ups flagged in PS rescan",
            "Any behavior change to the canonical 6-stage populate pipeline beyond the named P0 fixes",
        ],
    },
    "constraints": [
        "Do not regress the canonical pipeline: index.json 14-field schema and validation-report contract are locked; invariant tests must keep passing",
        "Windows-first path handling: every path fix must be tested with win32 separators (AC-09 dynamic-gap precedent)",
        "layers.json lives in the sibling ASSISTANT repo, not coderef-core (STUB-W8S124 precedent); path fixes must not assume a bundled copy",
        "Check STUB-9F63EJ (legacy retirement ruling) for overlap before authoring Phase 2 tasks — do not duplicate the retirement work",
        "Scanner exclude change will drop element counts (ghost .coderef entries); re-baseline deliberately, not silently",
    ],
}

# ---------------- Step 5: analysis.json ----------------
analysis = {
    "workorder_id": WO_ID,
    "feature_name": FEATURE,
    "analysis_authored_at": NOW,
    "blast_radius": {
        "files_modified": TOUCHES,
        "files_created": [
            "src/integration/rag/__tests__/incremental-state.regression.test.ts (or extension of existing suite)",
        ],
        "downstream_consumers": sorted(set(discovery["blast_radius"]))[:50] or [
            "MCP server tools (read .coderef artifacts)",
            "ASSISTANT skills invoking coderef-* bins (/coderef-pipeline, /coderef-rag-server, /populate-coderef)",
        ],
    },
    "risks": [
        {"id": "RISK-1", "title": "Scanner exclude change shifts index element counts (ghost entries removed)",
         "likelihood": "high", "impact": "medium",
         "mitigation": "Re-run scan+populate+validate after the exclude lands; expect a deliberate count drop; update any count-pinned invariants in the same commit."},
        {"id": "RISK-2", "title": "RAG state fix can orphan already-indexed vectors written under the old always-record path",
         "likelihood": "medium", "impact": "medium",
         "mitigation": "Reindex after the fix (/coderef-rag-server index); add the regression test (P1-T6) so failed embeds can never be recorded again."},
        {"id": "RISK-3", "title": "Gating breaking-changes breaks callers of coderef-analyze --type=breaking-changes",
         "likelihood": "low", "impact": "low",
         "mitigation": "Fail loudly with an explicit not-implemented error and document it in --help; silent empty output is the current, worse failure mode."},
        {"id": "RISK-4", "title": "Hardcoded-path replacement changes coderef-watch / coderef-rag-server startup on this machine",
         "likelihood": "medium", "impact": "medium",
         "mitigation": "Env-var override with cwd-relative fallback; verify both bins start on Windows before commit (P1-T12)."},
        {"id": "RISK-5", "title": "Phase 2 scope overlaps STUB-9F63EJ retirement ruling (double-planned work)",
         "likelihood": "medium", "impact": "low",
         "mitigation": "Reconcile STUB-9F63EJ during Phase 2 planning (deferred); recorded as a hard constraint."},
    ],
    "candidates": discovery["candidates"],
    "dependencies": [
        "vitest (test baseline gate)",
        "tree-sitter language packs (canonical fact extraction; unaffected by P0 but the substrate P1 routes onto)",
        "acorn (the wrong parser on the Scanner live path — evidence for P1, untouched in P0)",
        "ollama/OpenAI embedding providers (RAG state fix touches their write path)",
        "SKILLS/TRACKING/registry-db (stub/WO registration)",
    ],
    "public_api_hits": discovery["public_api_hits"],
    "decision_records": [
        {"id": "DR-1", "decision": "Rolling-plan shape (operator ruling A) over strict one-shot or P0-only strict WO",
         "rationale": "P1/P2 task detail authored now would go stale once P0 lands; ROLLING-PLAN.md exists for exactly this; user intent 'strict phased' honored as strict-discipline phase gates."},
        {"id": "DR-2", "decision": "plan_type forced strict->phased per --phased-stubs contract",
         "rationale": "ROLLING-PLAN.md: 'a strict rolling plan defeats the purpose'; force logged to decisions_log."},
        {"id": "DR-3", "decision": "Follow-on stubs minted fresh (STUB-XG7DSB, STUB-01DW28) rather than splitting STUB-W45PTN",
         "rationale": "Keeps the originating stub as the single tracking parent (user: 'one /stub to track'); follow-ons are phase-binding artifacts under the same WO."},
    ],
}

# ---------------- Step 6: plan.json via planner engine ----------------
P0_TASKS = [
    {"id": "P1-T1", "verb": "READ",
     "description": "Load Phase 1 inputs: stub context coderef/working/repo-review-2026-07-remediation/context.md (P0-1..P0-6), report coderef/reference/repo-review-2026-07-02.md section 6, and this WO's analysis.json risks.",
     "touches": []},
    {"id": "P1-T2", "verb": "TEST",
     "description": "Baseline: run npx vitest run; confirm exactly the 2 known failures (buildDependencyGraph.test.ts ENOENT mkdir .test-project/.coderef; ast-mode recursive-mode test) and record counts (last known 1660 pass / 2 fail / 30 skip).",
     "touches": []},
    {"id": "P1-T3", "verb": "EDIT",
     "description": "P0-1 fix coderef-query end-to-end: invoke analyzer.analyze() (src/cli/coderef-query.ts:86-95) before dispatching query types; verify each --type returns non-empty results on a coderef-core self-scan.",
     "touches": ["src/cli/coderef-query.ts"]},
    {"id": "P1-T4", "verb": "EDIT",
     "description": "P0-2 gate breaking-changes until real: make coderef-analyze --type=breaking-changes fail loudly with an explicit not-implemented error (or remove the wiring) instead of returning silently-empty results from the placeholder stubs at diff-analyzer.ts:130-160; document in --help.",
     "touches": ["src/context/breaking-change-detector/diff-analyzer.ts", "src/cli/coderef-analyze.ts"]},
    {"id": "P1-T5", "verb": "EDIT",
     "description": "P0-3 RAG incremental truth: persist indexed-state only for chunks whose embed SUCCEEDED (indexing-orchestrator.ts ~line 919) and wire chunksToDelete through vectorStore.delete() in the incremental path so removed code leaves the vector store.",
     "touches": ["src/integration/rag/indexing-orchestrator.ts", "src/integration/rag/incremental-indexer.ts"]},
    {"id": "P1-T6", "verb": "TEST",
     "description": "P0-3 regression tests: a chunk whose embed fails is NOT recorded as indexed; a chunk removed from source triggers vectorStore.delete(). Add to src/integration/rag/__tests__/.",
     "touches": ["src/integration/rag/__tests__/"]},
    {"id": "P1-T7", "verb": "EDIT",
     "description": "P0-4a stop self-ingestion: add .coderef/** (and the repo-root .coderef-rag-index.json state file) to DEFAULT_EXCLUDE_PATTERNS in src/scanner/scanner.ts and the mirrored default in src/index.ts.",
     "touches": ["src/scanner/scanner.ts", "src/index.ts"]},
    {"id": "P1-T8", "verb": "DELETE",
     "description": "P0-4b remove committed residue: git rm -r --cached the committed rag-vectors.sqlite/ directory residue and any committed .coderef self-scan artifacts; add matching .gitignore entries so they cannot return.",
     "touches": [".gitignore"]},
    {"id": "P1-T9", "verb": "EDIT",
     "description": "P0-5 remove hardcoded machine paths: replace C:/Users/willh defaults at coderef-watch.ts:233/274 and coderef-rag-server.ts:386 with env-var override + cwd-relative fallback; no literal user-profile paths remain in src/.",
     "touches": ["src/cli/coderef-watch.ts", "src/cli/coderef-rag-server.ts"]},
    {"id": "P1-T10", "verb": "EDIT",
     "description": "P0-6 fix the 2 failing tests: create the .test-project fixture dir (recursive mkdir) in buildDependencyGraph.test.ts setup; fix the ast-mode recursive-mode fixture/expectation so it passes from a clean checkout.",
     "touches": ["src/fileGeneration/__tests__/buildDependencyGraph.test.ts", "src/scanner/__tests__/ast-mode.test.ts"]},
    {"id": "P1-T11", "verb": "TEST",
     "description": "Green baseline gate: npx vitest run completes with 0 failures (skips unchanged).",
     "touches": []},
    {"id": "P1-T12", "verb": "RUN",
     "description": "Pipeline verification: npm run build, then fresh scan + populate + validate on coderef-core itself; confirm ghost .coderef index entries (types.d.ts / scanner.js class) are gone, validation report is clean, and coderef-watch + coderef-rag-server still start on Windows.",
     "touches": []},
    {"id": "P1-T13", "verb": "COMMIT",
     "description": "Commit Phase 1 on main by EXPLICIT path (never git add -A) with a plain-English message referencing WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 1 / STUB-W45PTN.",
     "touches": []},
    {"id": "P1-T14", "verb": "STOP",
     "description": "Hard stop: report Phase 1 results back (test counts, element-count delta from the exclude change, reindex outcome). Operator review gates Phase 2 planning: author Phase 2 tasks against STUB-XG7DSB only after this review, reconciling STUB-9F63EJ overlap first.",
     "touches": []},
]

overrides = {
    "approved_tasks": P0_TASKS,
    "hard_stops": [1],
    "phase_1_name": "P0 — Correctness & Trust",
}

print("[author] Step 6: create_plan(phased) ...")
plan = create_plan(goal=GOAL, plan_type="phased", discovery=discovery, overrides=overrides)

# Step 6 required metadata
plan["workorder_id"] = WO_ID
plan["feature_name"] = FEATURE
plan["created"] = NOW
plan["plan_type_rationale"] = context["classification"]["plan_type_rationale"]
plan["plan_type_decided_by"] = "create-workorder@2.15.2"

# Step 4.7 rolling-plan augmentation
plan["rolling_plan"] = {
    "mode": "rolling",
    "close_after_phase": 3,
    "report_back_required_after_each_phase": True,
    "next_phase_authoring": "ad-hoc plan.json edit until /plan-next-phase skill exists (STUB-358)",
}
plan["phases"][0]["stub_ref"] = "STUB-W45PTN"

DEFERRED = [
    (2, "repo-review-p1-structural — DEFERRED", "STUB-XG7DSB"),
    (3, "repo-review-p2-perf-hygiene — DEFERRED", "STUB-01DW28"),
]
for n, name, stub in DEFERRED:
    plan["phases"].append({
        "phase": n,
        "name": name,
        "hard_stop": True,
        "stub_ref": stub,
        "plan_deferred": True,
        "description": "",
        "tasks": [{
            "id": f"P{n}-T0",
            "verb": "STOP",
            "description": (f"PLACEHOLDER. Phase {n} tasks not yet authored. Pre-condition: Phase {n-1} "
                            f"must be COMPLETED + REVIEWED before this phase's plan is authored (against {stub})."),
            "touches": [],
        }],
    })

plan["hard_stops"] = [
    {"phase": 1, "approved": False, "reason": "Phase 1 ends with mandatory user review (rolling plan: report back before Phase 2 is planned)."},
    {"phase": 2, "approved": False, "reason": "Phase 2 plan_deferred=true. Hard stop fires at phase planning gate."},
    {"phase": 3, "approved": False, "reason": "Phase 3 plan_deferred=true. Hard stop fires at phase planning gate."},
]

# Step 6.6 inter_phase_hooks (phased defaults; placeholders resolved by /execute-workorder at fire time)
for p in plan["phases"]:
    p["inter_phase_hooks"] = {
        "pre_phase": ["/discover {feature_name} phase {N}@quick"],
        "post_phase": ["/discover {feature_name} phase {N} post@quick"],
    }

# Step 6.7 workorder_hooks (phased defaults)
plan["workorder_hooks"] = {
    "post_plan": ["/discover {feature_name}@medium --output-dest=working:coderef/workorder/{feature_name}/discover-post-plan.md"],
    "post_execute": ["/discover {feature_name} post-execute@medium --output-dest=working:coderef/workorder/{feature_name}/discover-post-execute.md"],
    "plan_gaps": ["/discover {feature_name} plan-gaps@medium --output-dest=working:coderef/workorder/{feature_name}/discover-plan-gaps.md"],
}

print("[author] re-validating augmented plan against plan.schema.json ...")
validate_plan(plan, raise_on_error=True)
print("[author]   plan schema PASS")

# ---------------- Step 7: communication.json ----------------
communication = {
    "workorder_id": WO_ID,
    "feature_name": FEATURE,
    "created": NOW,
    "owner_domain": "CODEREF-CORE",
    "target_project": "coderef-core",
    "originating_dispatches": [],
    "parent_stub_id": "STUB-W45PTN",
    "predecessor_for": None,
    "status": "plan_created",
    "current_phase": 1,
    "phase_status": "ready",
    "plan_file": str(WO_DIR / "plan.json"),
    "context_file": str(WO_DIR / "context.json"),
    "analysis_file": str(WO_DIR / "analysis.json"),
    "handoff": {
        "from": "create-workorder",
        "to": "execute-workorder",
        "reason": "plan_created; Phase 1 (P0 correctness & trust) fully authored and ready; Phases 2-3 deferred (rolling plan)",
    },
    "execution_rules": [
        "Rolling plan: execute phase-by-phase; report back after EVERY phase (rolling_plan.report_back_required_after_each_phase=true)",
        "Phases 2-3 are plan_deferred placeholders — author their tasks only after the prior phase is completed + reviewed (ad-hoc plan.json edit until /plan-next-phase ships; flip the bound stub deferred_phase->promoted when authored)",
        "Hard stop at the end of every phase; hard_stops[].approved flips only on operator review",
        "Commit on main by EXPLICIT path (main-only git model; never git add -A)",
        "Do not regress the canonical pipeline: locked index.json/validation schemas and invariant tests must keep passing",
    ],
    "hard_constraints": [
        "Windows-first path testing on every path-related change",
        "layers.json resolves from the sibling ASSISTANT repo, never a bundled copy",
        "Reconcile STUB-9F63EJ overlap before authoring Phase 2 tasks",
        "Element-count re-baseline after scanner exclude change must be an explicit, reviewed commit",
    ],
    "blockers": [],
    "decisions_log": [
        {"event": "plan_type_forced", "from": "strict", "to": "phased",
         "reason": "--phased-stubs implies phased (ROLLING-PLAN.md: a strict rolling plan defeats the purpose); user's --plan-type=strict and category-fix mapping both overridden",
         "at": NOW},
        {"event": "operator_ruling", "question": "bare --phased-stubs with no follow-on stubs vs single stub covering three tiers",
         "ruling": "(A) rolling plan: minted STUB-XG7DSB (P1 structural) + STUB-01DW28 (P2 perf/hygiene) as deferred-phase bindings; STUB-W45PTN remains the tracking parent",
         "at": NOW},
        {"event": "approved_tasks_injected", "count": len(P0_TASKS),
         "source": "inline-authored from stub context.md items P0-1..P0-6 (no --tasks-file)", "at": NOW},
        {"event": "inter_phase_hooks_populated", "plan_type": "phased", "phase_count": 3, "source": "default", "at": NOW},
        {"event": "workorder_hooks_populated", "plan_type": "phased", "source": "default", "at": NOW},
    ],
    "phase_transitions": [],
    "plan_adjustments": [],
    "git_branch": "wo/repo-review-2026-07-remediation",
    "communication_log": [
        {"at": NOW, "from": "create-workorder", "entry":
         f"Workorder created via stub promotion (STUB-W45PTN -> {WO_ID}); rolling plan with deferred phases bound to STUB-XG7DSB / STUB-01DW28."},
    ],
    "required_skills": ["/execute-workorder", "/close-workorder", "/log-session"],
}

# ---------------- persist all four ----------------
WO_DIR.mkdir(parents=True, exist_ok=True)
for name, obj in (("context.json", context), ("analysis.json", analysis),
                  ("plan.json", plan), ("communication.json", communication)):
    (WO_DIR / name).write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")
    print(f"[author] wrote {name}")

print("[author] DONE", WO_ID)
